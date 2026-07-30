const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { blueprintInterpretationPrompt } = require("../lib/prompts/creatorBlueprint");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintLoadPhase, blueprintState } = require("../lib/blueprint/state");
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
    { status: "in_desfasurare" },
    { status: "confirmat", confirmed_at: "2026-07-30T00:00:00Z" },
    { raw_answer: "Raw", interpreted_answer: "Interpretation", adjustment_request: "Adjustment" }
  );
  assert.deepEqual(state, { started: true, rawAnswer: "Raw", interpretation: "Interpretation", adjustmentRequest: "Adjustment", completed: true });
  assert.equal(blueprintState({ status: "inceput" }, { status: "inceput" }, null).started, false);
});

test("Blueprint database statuses use the authoritative Romanian values", () => {
  assert.deepEqual(BLUEPRINT_STATUS, { NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare" });
  assert.deepEqual(SECTION_STATUS, { NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat" });
  const stateSource = readFileSync(join(__dirname, "..", "lib", "blueprint", "state.js"), "utf8");
  const apiSource = readFileSync(join(__dirname, "..", "pages", "api", "blueprint.js"), "utf8");
  for (const deprecated of ["not_started", "in_progress", "completed"]) {
    assert.doesNotMatch(stateSource, new RegExp(`"${deprecated}"`));
    assert.doesNotMatch(apiSource, new RegExp(`"${deprecated}"`));
  }
});

test("initial Blueprint loading failures produce a retryable error phase", () => {
  const session = { access_token: "token" };
  assert.equal(blueprintLoadPhase(undefined, null, ""), "authenticating");
  assert.equal(blueprintLoadPhase(null, null, ""), "unauthenticated");
  assert.equal(blueprintLoadPhase(session, null, ""), "loading");
  assert.equal(blueprintLoadPhase(session, null, "Nu am putut încărca."), "error");
  assert.equal(blueprintLoadPhase(session, { atelier: {} }, ""), "ready");
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

test("migration enforces upsert uniqueness only when no equivalent unique index exists", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260730000000_extend_blueprint_answers_vertical_slice.sql"), "utf8");
  assert.equal((migration.match(/if not exists \(/g) || []).length, 3);
  assert.equal((migration.match(/i\.indisunique/g) || []).length, 3);
  assert.equal((migration.match(/i\.indpred is null/g) || []).length, 3);
  assert.match(migration, /creator_blueprints \(user_id\)/);
  assert.match(migration, /blueprint_sections \(user_id, atelier_number\)/);
  assert.match(migration, /blueprint_answers \(user_id, atelier_number, question_number\)/);
});
