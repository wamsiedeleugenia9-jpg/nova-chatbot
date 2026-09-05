const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const migration = readFileSync(join(root, "supabase/migrations/20260905020000_create_ewa_chat_requests.sql"), "utf8");
const api = readFileSync(join(root, "pages/api/chat.js"), "utf8");
const history = readFileSync(join(root, "lib/chat/history.js"), "utf8");
const page = readFileSync(join(root, "pages/index.jsx"), "utf8");

test("final sources contain only the idempotent persistence and POST paths", () => {
  assert.equal((api.match(/from "\.\.\/\.\.\/lib\/chat\/history"/g) || []).length, 1);
  assert.equal((api.match(/const message =/g) || []).length, 1);
  assert.equal((api.match(/const requestId =/g) || []).length, 1);
  assert.equal((api.match(/completeChatRequest\(auth\.client, requestId, message, reply\)/g) || []).length, 1);
  assert.doesNotMatch(api, /saveChatExchange/);
  assert.doesNotMatch(history, /saveChatExchange/);
  assert.equal((page.match(/body: JSON\.stringify\(\{ message: msg, requestId \}\)/g) || []).length, 1);
  assert.doesNotMatch(page, /body: JSON\.stringify\(\{ message: msg \}\)/);
});

test("migration gives every user/request pair one durable state machine", () => {
  assert.match(migration, /unique \(user_id, request_id\)/);
  assert.match(migration, /status in \('processing', 'completed'\)/);
  assert.match(migration, /user_message text not null check \(char_length\(user_message\) between 1 and 4000\)/);
  assert.match(migration, /reply text/);
  assert.doesNotMatch(migration, /char_length\(reply\).*4000/);
});

test("atomic claim distinguishes winner, replay, conflict, and in-flight duplicate", () => {
  assert.match(migration, /on conflict \(user_id, request_id\) do nothing/);
  assert.match(migration, /if existing\.user_message <> p_user_message then return jsonb_build_object\('status', 'conflict'\)/);
  assert.match(migration, /if claimed then return jsonb_build_object\('status', 'claimed'\)/);
  assert.match(migration, /existing\.status = 'completed'[\s\S]*existing\.reply/);
  assert.match(migration, /jsonb_build_object\('status', 'processing'\)/);
  assert.doesNotMatch(migration, /created_at\s*</i);
});

test("completion stores exactly one exchange and replayable reply in one transaction", () => {
  assert.match(migration, /for update/);
  assert.match(migration, /request_row\.status <> 'processing'/);
  assert.equal((migration.match(/insert into public\.ewa_messages/g) || []).length, 1);
  assert.match(migration, /set status = 'completed', reply = p_assistant_message, completed_at = now\(\)/);
});

test("request records have owner RLS and mutations only through authenticated RPCs", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /revoke all on table public\.ewa_chat_requests from anon, authenticated/);
  assert.equal((migration.match(/security definer/g) || []).length, 2);
  assert.equal((migration.match(/grant execute on function/g) || []).length, 2);
});

test("API exits for duplicate states before either Anthropic call", () => {
  const claim = api.indexOf("claimChatRequest(auth.client, requestId, message)");
  const replay = api.indexOf('claim.status === "completed"');
  const processing = api.indexOf('claim.status === "processing"');
  const anthropic = api.indexOf('fetch("https://api.anthropic.com/v1/messages"');
  assert.ok(claim > -1 && replay > claim && processing > replay && anthropic > processing);
  assert.match(api, /status\(409\).*requestId a fost deja folosit pentru alt mesaj/);
  assert.match(api, /setHeader\("Retry-After", "3"\)/);
  assert.match(api, /retryable: true/);
});
