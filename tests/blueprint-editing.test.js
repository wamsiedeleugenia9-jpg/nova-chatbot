const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState, changedWorkshopAnswers, normalizeWorkshopAnswers } = require("../lib/blueprint/state");

test("a completed workshop reopens with every persisted answer prefilled after reload", () => {
  const answers = [
    { atelier_number: 3, question_number: 1, raw_answer: "Înainte", interpreted_answer: "Înainte" },
    { atelier_number: 3, question_number: 2, raw_answer: "După", interpreted_answer: "După" }
  ];
  const state = blueprintState(
    { status: BLUEPRINT_STATUS.COMPLETED, current_atelier: 3 },
    [{ atelier_number: 3, status: SECTION_STATUS.REVIEW, confirmed_at: "2026-08-01T00:00:00Z", interpreted_summary: "Rezumat confirmat" }],
    answers
  );
  assert.equal(state.editing, true);
  assert.equal(state.editingAnswers, true);
  assert.deepEqual(state.answers.map(item => item.rawAnswer), ["Înainte", "După"]);
});

test("editing detects only changed answers and does not rewrite unrelated workshop data", () => {
  const allAnswers = [
    { atelier_number: 1, question_number: 1, raw_answer: "Identitate" },
    { atelier_number: 2, question_number: 1, raw_answer: "Client vechi" },
    { atelier_number: 2, question_number: 2, raw_answer: "Dorință" }
  ];
  const submitted = normalizeWorkshopAnswers({ questions: ["Client", "Dorință"] }, [
    { questionNumber: 1, answer: "Client nou" },
    { questionNumber: 2, answer: "Dorință" }
  ]);
  assert.deepEqual(changedWorkshopAnswers(allAnswers.filter(item => item.atelier_number === 2), submitted), [{ questionNumber: 1, rawAnswer: "Client nou" }]);
  assert.equal(allAnswers[0].raw_answer, "Identitate");
});

test("edit API regenerates the affected summary and Creator DNA, while reset requires explicit confirmation", () => {
  const api = readFileSync(join(__dirname, "..", "pages", "api", "blueprint.js"), "utf8");
  assert.match(api, /action === "edit_workshop"/);
  assert.match(api, /action === "save_edit"[\s\S]*sectionSummaryPrompt\(\{ atelier, answers: submitted \}\)/);
  assert.match(api, /records\.blueprint\?\.status === BLUEPRINT_STATUS\.COMPLETED[\s\S]*regenerateCreatorDna/);
  assert.match(api, /action === "reset"[\s\S]*req\.body\?\.confirm !== true/);
  assert.match(api, /\["creator_dna", "blueprint_answers", "blueprint_sections"\]/);
});

test("edit UI exposes all workshop choices and an independently confirmed reset", () => {
  const page = readFileSync(join(__dirname, "..", "pages", "blueprint.jsx"), "utf8");
  for (const label of ["Cine ești", "Pentru cine creezi", "Transformarea", "Oferta", "Vocea", "Conținutul", "Business", "Creator DNA / De ce faci asta"]) assert.match(page, new RegExp(label));
  assert.match(page, /Editează Creator Blueprint/);
  assert.match(page, /Refă Creator Blueprint de la început/);
  assert.match(page, /action: "reset", confirm: true/);
});

test("completed Creator DNA provides explicit navigation to the main EWA route", () => {
  const page = readFileSync(join(__dirname, "..", "pages", "blueprint.jsx"), "utf8");
  assert.match(page, /<a href="\/"[^>]*>Înapoi la EWA<\/a>/);
});
