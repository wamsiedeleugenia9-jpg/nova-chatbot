const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { CREATOR_DNA_KEYS, CREATOR_DNA_TOOL_NAME, appendWhy, creatorDnaFromResponse, creatorDnaRequestOptions, creatorDnaResponseDiagnostics } = require("../lib/blueprint/creatorDnaResponse");
const { creatorDnaPrompt } = require("../lib/prompts/creatorBlueprint");

const generated = Object.fromEntries(CREATOR_DNA_KEYS.map(key => [key, `Text ${key}`]));

test("Creator DNA forces structured Sections 1–7 with every stable key", () => {
  const options = creatorDnaRequestOptions();
  assert.deepEqual(options.tool_choice, { type: "tool", name: CREATOR_DNA_TOOL_NAME });
  assert.deepEqual(options.tools[0].input_schema.required, CREATOR_DNA_KEYS);
  assert.equal(options.tools[0].input_schema.additionalProperties, false);
  assert.deepEqual(creatorDnaFromResponse([{ type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: generated }]), generated);
  assert.throws(() => creatorDnaFromResponse([{ type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: { ...generated, voice: "" } }]), /invalid structured Creator DNA/);
});

test("Creator DNA accepts Anthropic's camel-case tool input and returns stable storage keys", () => {
  const actualResponse = {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: {
      creatorIdentity: generated.creator_identity,
      audience: generated.audience,
      transformation: generated.transformation,
      offer: generated.offer,
      voice: generated.voice,
      contentSystem: generated.content_system,
      businessGoal: generated.business_goal
    } }]
  };
  assert.deepEqual(creatorDnaFromResponse(actualResponse), generated);
});

test("missing, duplicate, and malformed Creator DNA tool output is rejected with safe diagnostics", () => {
  assert.throws(() => creatorDnaFromResponse({ content: [{ type: "text", text: "private output" }] }), error =>
    error.code === "INVALID_CREATOR_DNA_RESPONSE" && error.reason === "missing_tool_output");
  assert.throws(() => creatorDnaFromResponse({ content: [
    { type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: generated },
    { type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: generated }
  ] }), error => error.reason === "duplicate_tool_output");
  assert.throws(() => creatorDnaFromResponse([{ type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: { ...generated, extra: "no" } }]),
    error => error.reason === "unexpected_or_duplicate_key");
  const diagnostics = creatorDnaResponseDiagnostics({ stop_reason: "max_tokens", content: [{ type: "tool_use", name: CREATOR_DNA_TOOL_NAME, input: { voice: "secret" } }] });
  assert.deepEqual(diagnostics, { stopReason: "max_tokens", contentType: "array", blocks: [{ type: "tool_use", name: CREATOR_DNA_TOOL_NAME, inputType: "object", inputKeys: ["voice"] }] });
  assert.doesNotMatch(JSON.stringify(diagnostics), /secret/);
});

test("Section 8 is appended server-side exactly from the persisted raw answer", () => {
  const raw = "Motivul meu, exact așa cum l-am scris.";
  assert.deepEqual(appendWhy(generated, raw), { ...generated, why: raw });
  assert.equal(CREATOR_DNA_KEYS.includes("why"), false);
  const prompt = creatorDnaPrompt({ sections: [], answers: [] });
  assert.match(prompt.system, /Nu crea și nu returna secțiunea/);
});

test("API gates generation, supports 7 to 8, prevents Workshop 9, and upserts retry-safely", () => {
  const api = readFileSync(join(__dirname, "..", "pages", "api", "blueprint.js"), "utf8");
  assert.match(api, /allConfirmed/);
  assert.match(api, /length === 8/);
  assert.match(api, /atelierNumber >= 8/);
  assert.match(api, /atelierNumber \+ 1/);
  assert.match(api, /from\("creator_dna"\)\.upsert/);
  assert.match(api, /onConflict: "user_id"/);
  assert.match(api, /if \(!records\.creatorDna\)/);
  assert.match(api, /status: BLUEPRINT_STATUS\.COMPLETED, completed_at:/);
  assert.ok(api.indexOf('from("creator_dna").upsert') < api.indexOf("status: BLUEPRINT_STATUS.COMPLETED"));
});

test("Creator DNA is loaded with Blueprint persistence", () => {
  const api = readFileSync(join(__dirname, "..", "pages", "api", "blueprint.js"), "utf8");
  assert.match(api, /from\("creator_dna"\)\.select\("sections,created_at,updated_at"\)/);
  assert.match(api, /creatorDna: records\.creatorDna\?\.sections \|\| null/);
});

test("Creator DNA migration provides one row per user and owner-only RLS", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260809000000_create_creator_dna.sql"), "utf8");
  assert.match(migration, /unique \(user_id\)/i);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /for select to authenticated[\s\S]*auth\.uid\(\).*user_id/i);
  assert.match(migration, /for insert to authenticated[\s\S]*with check[\s\S]*auth\.uid\(\).*user_id/i);
  assert.match(migration, /for update to authenticated[\s\S]*using[\s\S]*auth\.uid\(\).*user_id[\s\S]*with check/i);
  assert.match(migration, /before update on public\.creator_dna/i);
});
