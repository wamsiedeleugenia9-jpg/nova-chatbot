const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const api = readFileSync(join(root, "pages", "api", "blueprint.js"), "utf8");
const page = readFileSync(join(root, "pages", "blueprint.jsx"), "utf8");

test("active Founders retain the normal Blueprint creation and mutation path", () => {
  assert.match(api, /if \(authorization\.allowed\) records = await ensure\(client, user\.id, records\)/);
  assert.match(api, /records = await ensure\(client, user\.id, records\);[\s\S]*const action = req\.body\?\.action/);
  assert.match(api, /responsePayload\(records, true\)/);
});

test("an unsubscribed new user cannot create or mutate Blueprint data", () => {
  const denial = api.indexOf('if (req.method === "POST" && !authorization.allowed)');
  const mutationSetup = api.indexOf("records = await ensure(client, user.id, records);", denial);
  assert.ok(denial > -1 && mutationSetup > denial, "POST denial must precede every mutation/setup path");
  assert.match(api, /if \(authorization\.allowed\) records = await ensure/);
  assert.match(page, /if \(!data\.entitled\)[\s\S]*Abonament Founder necesar/);
  assert.match(page, /data\.hasBlueprint \? "Blueprint-ul tău existent rămâne disponibil doar pentru citire/);
});

test("an unsubscribed existing Blueprint is loaded but exposed read-only", () => {
  assert.match(api, /let records = await load\(client, user\.id\);[\s\S]*if \(req\.method === "GET"\)/);
  const readOnly = page.match(/if \(!data\.entitled\) return ([\s\S]*?)return <main style=\{shell\}><div style=\{card\}>/)[1];
  assert.match(readOnly, /data\.hasBlueprint/);
  for (const mutation of ["act(", "openWorkshop(", "saveEdit("]) assert.doesNotMatch(readOnly, new RegExp(mutation.replace("(", "\\(")));
});

test("Blueprint persistence queries remain scoped to the authenticated user", () => {
  assert.match(api, /const \{ client, user \} = auth/);
  for (const table of ["creator_blueprints", "blueprint_sections", "blueprint_answers", "creator_dna"]) {
    assert.match(api, new RegExp(`from\\("${table}"\\)[\\s\\S]{0,180}\\.eq\\("user_id", userId\\)`));
  }
  assert.doesNotMatch(api, /SUPABASE_SERVICE_ROLE_KEY|privilegedSupabase/);
});
