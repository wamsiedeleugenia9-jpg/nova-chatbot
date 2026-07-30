const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { blueprintInterpretationPrompt } = require("../lib/prompts/creatorBlueprint");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState } = require("../lib/blueprint/state");
const { authenticatedClient, bearerToken } = require("../lib/server/supabase");

test("Blueprint prompt configuration supports initial and adjustment interpretations", () => {
  const initial = blueprintInterpretationPrompt({ answer: "Povestea mea" });
  assert.match(initial.message, /Povestea mea/);
  assert.doesNotMatch(initial.message, /undefined/);

  const adjusted = blueprintInterpretationPrompt({ answer: "Povestea", currentInterpretation: "Interpretarea", adjustment: "Mai direct" });
  assert.match(adjusted.system, /ajustarea cerută/);
  assert.match(adjusted.message, /Mai direct/);
});

test("protected APIs require a correctly formed bearer token", () => {
  assert.equal(bearerToken({ headers: {} }), null);
  assert.equal(bearerToken({ headers: { authorization: "Basic abc" } }), null);
  assert.equal(bearerToken({ headers: { authorization: "Bearer access-token" } }), "access-token");
  assert.equal(bearerToken({ headers: { authorization: "bearer access-token" } }), "access-token");
});

test("authentication rejects a request without credentials before database access", async () => {
  assert.equal(await authenticatedClient({ headers: {} }), null);
});

test("package.json is valid and defines each script once", () => {
  const packageText = readFileSync(join(__dirname, "..", "package.json"), "utf8");
  const packageJson = JSON.parse(packageText);
  assert.equal(packageJson.scripts.start, "next start");
  for (const script of ["dev", "build", "start", "test", "lint"]) {
    assert.equal((packageText.match(new RegExp(`"${script}"\\s*:`, "g")) || []).length, 1);
  }
});

test("saved approved-table records restore Blueprint state", () => {
  const state = blueprintState(
    { status: BLUEPRINT_STATUS.IN_PROGRESS },
    { status: SECTION_STATUS.COMPLETED, confirmed_at: "2026-07-30T00:00:00Z" },
    { raw_answer: "Raw", interpreted_answer: "Interpretation", adjustment_request: "Adjustment" }
  );
  assert.deepEqual(state, { started: true, rawAnswer: "Raw", interpretation: "Interpretation", adjustmentRequest: "Adjustment", completed: true });
});

test("canonical content is explicitly temporary and never presented as approved copy", () => {
  const content = JSON.parse(readFileSync(join(__dirname, "..", "content", "creator-blueprint.json"), "utf8"));
  assert.equal(content.contentStatus, "temporary-placeholder-awaiting-approved-ewa-mvp-document");
  assert.match(content.introduction, /TEMPORAR/);
  assert.match(content.atelier.introduction, /TEMPORAR/);
  assert.match(content.atelier.question.text, /TEMPORAR/);
});

test("migration extends approved answers table without creating a parallel table", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260730000000_extend_blueprint_answers_vertical_slice.sql"), "utf8");
  assert.match(migration, /alter table public\.blueprint_answers/);
  assert.doesNotMatch(migration, /creator_blueprint_responses/);
  assert.doesNotMatch(migration, /create table/i);
});
