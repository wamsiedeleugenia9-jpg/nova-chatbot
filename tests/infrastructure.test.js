const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const content = require("../content/creator-blueprint.json");
const { blueprintSummaryPrompt } = require("../lib/prompts/creatorBlueprint");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState, firstUnansweredQuestion } = require("../lib/blueprint/state");
const { authenticatedClient, bearerToken } = require("../lib/server/supabase");

test("summary prompt includes every answer and supports workshop-only adjustment", () => {
  const atelier = content.ateliers[0];
  const answers = atelier.questions.map(question => ({ question_number: question.number, raw_answer: `Răspuns ${question.number}` }));
  const initial = blueprintSummaryPrompt({ atelier, answers });
  assert.match(initial.message, /Răspuns 1/);
  assert.match(initial.message, /Răspuns 3/);
  const completeFeedback = "Nu folosește cuvintele mele\nFolosește expresia «pas cu pas», exact cum am scris eu.";
  const adjusted = blueprintSummaryPrompt({ atelier, answers, currentSummary: "Sinteză", adjustment: completeFeedback });
  assert.match(adjusted.system, /numai sinteza acestui atelier/);
  assert.match(adjusted.message, /Nu folosește cuvintele mele/);
  assert.match(adjusted.message, /Folosește expresia «pas cu pas», exact cum am scris eu\./);
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
  for (const script of ["dev", "build", "start", "test", "lint"]) assert.equal((packageText.match(new RegExp(`"${script}"\\s*:`, "g")) || []).length, 1);
});

test("status constants contain exactly the approved production values", () => {
  assert.deepEqual(BLUEPRINT_STATUS, { NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat", NEEDS_REVIEW: "de_revizuit" });
  assert.equal(SECTION_STATUS.NEEDS_REVIEW, "de_revizuit");
});

test("Creator Blueprint contains Ateliers 1 through 7 and no Atelier 8", () => {
  assert.deepEqual(content.ateliers.map(atelier => atelier.number), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(content.ateliers.every(atelier => atelier.questions.length > 0));
});

test("progress restores from the first unanswered question number rather than answer count", () => {
  const atelier = content.ateliers[0];
  const answers = [
    { atelier_number: 1, question_number: 1, raw_answer: "Unu" },
    { atelier_number: 1, question_number: 3, raw_answer: "Trei" }
  ];
  assert.equal(firstUnansweredQuestion(atelier, answers).number, 2);
  const state = blueprintState(content, { status: "in_desfasurare", current_atelier: 1 }, [{ atelier_number: 1, status: "in_desfasurare" }], answers);
  assert.equal(state.currentQuestion, 2);
});

test("all answers with a missing summary expose summary-only retry state", () => {
  const atelier = content.ateliers[0];
  const answers = atelier.questions.map(question => ({ atelier_number: 1, question_number: question.number, raw_answer: "Salvat" }));
  const state = blueprintState(content, { status: "in_desfasurare", current_atelier: 1 }, [{ atelier_number: 1, status: "in_desfasurare", interpreted_summary: null }], answers);
  assert.equal(state.currentQuestion, null);
  assert.equal(state.needsSummary, true);
});

test("Phase 2 answers migration remains additive and keeps approved tables", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260730000000_extend_blueprint_answers_vertical_slice.sql"), "utf8");
  assert.match(migration, /alter table public\.blueprint_answers/);
  assert.doesNotMatch(migration, /creator_blueprint_responses|create table/i);
});
