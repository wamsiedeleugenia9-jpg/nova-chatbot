const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { answerInterpretationPrompt, sectionSummaryPrompt } = require("../lib/prompts/creatorBlueprint");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState } = require("../lib/blueprint/state");
const { authenticatedClient, bearerToken } = require("../lib/server/supabase");

test("Blueprint prompts support per-answer interpretation and section adjustment", () => {
  const initial = answerInterpretationPrompt({ question: "De ce?", answer: "Povestea mea" });
  assert.match(initial.message, /Povestea mea/);
  const adjusted = sectionSummaryPrompt({ atelier: { number: 1, title: "Tu", summaryInstruction: "Scurt." }, answers: [{ questionNumber: 1, rawAnswer: "Povestea" }], currentSummary: "Interpretarea", adjustment: "Mai direct" });
  assert.match(adjusted.message, /Mai direct/);
  assert.match(adjusted.system, /JSON valid/);
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
  assert.deepEqual(BLUEPRINT_STATUS, { NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat" });
  assert.deepEqual(SECTION_STATUS, { NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat", REVIEW: "de_revizuit" });
  const state = blueprintState(
    { status: BLUEPRINT_STATUS.IN_PROGRESS, current_atelier: 1 },
    [{ atelier_number: 1, status: SECTION_STATUS.COMPLETED, confirmed_at: "2026-07-30T00:00:00Z", interpreted_summary: "Summary", key_elements: ["Key"] }],
    [{ atelier_number: 1, question_number: 1, raw_answer: "Raw", interpreted_answer: "Interpretation" }]
  );
  assert.equal(state.currentAtelier, 1);
  assert.equal(state.summary, "Summary");
  assert.equal(state.completed, true);
  assert.equal(state.answers[0].rawAnswer, "Raw");
  assert.equal("paused" in state, false);
});

test("progress restoration uses the first unanswered question without skipping gaps", () => {
  const state = blueprintState(
    { status: BLUEPRINT_STATUS.IN_PROGRESS, current_atelier: 2 },
    [{ atelier_number: 2, status: SECTION_STATUS.IN_PROGRESS }],
    [
      { atelier_number: 2, question_number: 1, raw_answer: "Unu" },
      { atelier_number: 2, question_number: 3, raw_answer: "Trei" }
    ]
  );
  assert.equal(state.currentQuestion, 2);
});

test("runtime does not depend on an unapproved paused_at column", () => {
  const stateSource = readFileSync(join(__dirname, "..", "lib", "blueprint", "state.js"), "utf8");
  const apiSource = readFileSync(join(__dirname, "..", "pages", "api", "blueprint.js"), "utf8");
  assert.doesNotMatch(stateSource, /paused_at/);
  assert.doesNotMatch(apiSource, /paused_at/);
  assert.match(apiSource, /current_atelier: atelierNumber/);
});

test("canonical content contains the official seven Phase 3 ateliers", () => {
  const content = JSON.parse(readFileSync(join(__dirname, "..", "content", "creator-blueprint.json"), "utf8"));
  assert.equal(content.contentStatus, "official-ewa-mvp");
  assert.equal(content.ateliers.length, 7);
  assert.deepEqual(content.ateliers.map(item => item.questions.length), [5, 4, 4, 4, 4, 4, 4]);
  assert.equal(content.ateliers[0].title, "Tu");
  assert.equal(content.ateliers[6].title, "Business");
  assert.equal(content.adjustmentOptions.length, 7);
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
