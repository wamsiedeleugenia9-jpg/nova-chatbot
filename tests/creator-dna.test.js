const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { CREATOR_DNA_KEYS, CREATOR_DNA_TOOL_NAME, appendWhy, creatorDnaFromResponse, creatorDnaRequestOptions } = require("../lib/blueprint/creatorDnaResponse");
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
