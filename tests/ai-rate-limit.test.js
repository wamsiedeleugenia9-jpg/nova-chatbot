const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { admitAiCall, requireAiCallPermit, sendAiAdmissionError, AI_RATE_LIMITED, AI_ADMISSION_UNAVAILABLE } = require("../lib/server/aiRateLimit");

const root = join(__dirname, "..");
const migration = readFileSync(join(root, "supabase/migrations/20260907000000_create_ai_rate_limit.sql"), "utf8");
const chat = readFileSync(join(root, "pages/api/chat.js"), "utf8");
const blueprint = readFileSync(join(root, "pages/api/blueprint.js"), "utf8");

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; }
  };
}

test("admission helper calls the no-input RPC and normalizes allowed and denied results", async () => {
  const calls = [];
  const allowed = await admitAiCall({ async rpc(...args) { calls.push(args); return { data: { allowed: true, remaining: 29, retry_after_seconds: 0 }, error: null }; } });
  assert.deepEqual(calls, [["admit_ai_call"]]);
  assert.deepEqual(allowed, { status: "allowed", remaining: 29 });

  const denied = await admitAiCall({ async rpc() { return { data: { allowed: false, remaining: 0, retry_after_seconds: 12 }, error: null }; } });
  assert.deepEqual(denied, { status: "rate_limited", retryAfterSeconds: 12 });
  await assert.rejects(requireAiCallPermit({ async rpc() { return { data: { allowed: false, retry_after_seconds: 12 }, error: null }; } }), error => {
    assert.equal(error.code, AI_RATE_LIMITED);
    assert.equal(error.retryAfterSeconds, 12);
    return true;
  });
});

test("admission helper fails closed for RPC errors, throws, and malformed results", async () => {
  for (const client of [
    { async rpc() { return { data: null, error: new Error("offline") }; } },
    { async rpc() { throw new Error("offline"); } },
    { async rpc() { return { data: { allowed: false, retry_after_seconds: 0 }, error: null }; } }
  ]) {
    assert.equal((await admitAiCall(client)).status, "unavailable");
    await assert.rejects(requireAiCallPermit(client), error => error.code === AI_ADMISSION_UNAVAILABLE);
  }
});

test("HTTP admission errors distinguish rate limiting from unavailability", () => {
  const limited = responseRecorder();
  sendAiAdmissionError(limited, { code: AI_RATE_LIMITED, retryAfterSeconds: 7 });
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers["Retry-After"], "7");
  assert.equal(limited.headers["Cache-Control"], "private, no-store");
  assert.deepEqual(limited.body, {
    error: "ai_rate_limit_exceeded",
    message: "Prea multe solicitări AI. Încearcă din nou în câteva momente.",
    retryAfterSeconds: 7
  });

  const unavailable = responseRecorder();
  sendAiAdmissionError(unavailable, new Error("offline"));
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.headers["Retry-After"], undefined);
  assert.equal(unavailable.body.error, "ai_admission_unavailable");
});

test("migration implements one locked 30-call, 60-second bucket per authenticated user", () => {
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /current_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(migration.match(/create or replace function public\.admit_ai_call\(\)[\s\S]*?\$\$;/)[0], /p_user_id|user_id uuid/);
  assert.match(migration, /for update/);
  assert.match(migration, /bucket\.call_count < 30/);
  assert.match(migration, /interval '60 seconds'/);
  assert.match(migration, /set window_started_at = current_time, call_count = 1/);
  assert.match(migration, /greatest\(1, ceil\(extract\(epoch/);
  assert.match(migration, /on conflict \(user_id\) do nothing/);
});

test("rate-limit state has no browser CRUD access and only narrow RPC execution", () => {
  assert.match(migration, /alter table public\.ai_rate_limit_buckets enable row level security/);
  assert.match(migration, /revoke all on table public\.ai_rate_limit_buckets from anon, authenticated/);
  assert.doesNotMatch(migration, /create policy/);
  assert.match(migration, /revoke all on function public\.consume_ai_call_permit\(\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.admit_ai_call\(\) to authenticated/);
});

test("chat claim and main-call admission are atomic and replays do not consume permits", () => {
  const claim = migration.slice(migration.indexOf("create or replace function public.claim_ewa_chat_request"));
  assert.match(claim, /on conflict \(user_id, request_id\) do nothing/);
  assert.match(claim, /if existing\.user_message <> p_user_message[\s\S]*'conflict'/);
  assert.match(claim, /if not claimed and existing\.status = 'completed'[\s\S]*'completed'/);
  assert.match(claim, /if not claimed then return jsonb_build_object\('status', 'processing'\)/);
  const admissionIndex = claim.indexOf("admission := public.consume_ai_call_permit()");
  assert.ok(admissionIndex > claim.indexOf("if not claimed"));
  assert.match(claim, /delete from public\.ewa_chat_requests where id = existing\.id;[\s\S]*'rate_limited'/);
});

test("chat removes the IP limiter and guards memory separately after durable completion", () => {
  assert.doesNotMatch(chat, /isRateLimited|requestLog|RATE_LIMIT_MAX_REQUESTS|x-forwarded-for/);
  assert.match(chat, /claim\.status === "rate_limited"[\s\S]*sendAiAdmissionError/);
  const completion = chat.indexOf("completeChatRequest(auth.client, requestId, message, reply)");
  const memoryAdmission = chat.indexOf("admitAiCall(auth.client)");
  const memoryFetch = chat.indexOf('fetch("https://api.anthropic.com/v1/messages"', memoryAdmission);
  assert.ok(completion > -1 && memoryAdmission > completion && memoryFetch > memoryAdmission);
  assert.match(chat, /admission\.status !== "allowed"[\s\S]*return res\.status\(200\)\.json\(\{ reply \}\)/);
  assert.match(chat, /if \(!isTruncated\)/);
});

test("Blueprint admission happens at each provider attempt and before completion-dependent writes", () => {
  const requestBody = blueprint.slice(blueprint.indexOf("const request = async maxTokens"), blueprint.indexOf("if (json) return summaryWithRetry"));
  assert.ok(requestBody.indexOf("requireAiCallPermit(telemetry.client)") < requestBody.indexOf('fetch("https://api.anthropic.com/v1/messages"'));
  assert.match(blueprint, /if \(json\) return summaryWithRetry\(request/);
  const dna = blueprint.slice(blueprint.indexOf("async function askCreatorDna"), blueprint.indexOf("async function load"));
  assert.ok(dna.indexOf("requireAiCallPermit(client)") < dna.indexOf('fetch("https://api.anthropic.com/v1/messages"'));

  const submit = blueprint.match(/action === "submit"([\s\S]*?)action === "adjust"/)[1];
  assert.ok(submit.indexOf("finalSummary = await askClaude") < submit.indexOf('from("blueprint_answers").upsert'));
  const confirm = blueprint.match(/action === "confirm"([\s\S]*?)action === "continue"/)[1];
  assert.ok(confirm.indexOf("generateCreatorDna") < confirm.indexOf("updateSection"));
  const saveEdit = blueprint.match(/action === "save_edit"([\s\S]*?)action === "cancel_edit"/)[1];
  assert.ok(saveEdit.lastIndexOf("generateCreatorDna") < saveEdit.indexOf('client.rpc("save_blueprint_workshop_edit"'));
});
