const test = require("node:test");
const assert = require("node:assert/strict");
const CONTENT = require("../content/creator-blueprint.json");
const { CREATOR_DNA_KEYS } = require("../lib/blueprint/creatorDnaResponse");
const { creatorDnaPrompt, sectionSummaryPrompt, SUMMARY_DISCIPLINE } = require("../lib/prompts/creatorBlueprint");

function promptFor(atelierNumber) {
  return sectionSummaryPrompt({
    atelier: CONTENT.ateliers[atelierNumber - 1],
    answers: [{ questionNumber: 1, rawAnswer: "Răspuns confirmat" }]
  }).system;
}

test("shared summary discipline prevents preferences from becoming performance claims", () => {
  assert.match(SUMMARY_DISCIPLINE, /o preferință nu este dovadă de performanță/);
  assert.match(promptFor(6), /„cel mai puternic”/);
  assert.match(promptFor(6), /formatul ales/);
});

test("shared summary discipline prevents a selected price from becoming market validation", () => {
  assert.match(promptFor(4), /un preț ales nu este validare de piață/);
  assert.match(promptFor(4), /„accesibil”/);
  assert.match(promptFor(4), /„competitiv”/);
});

test("content recommendations remain distinct from confirmed choices", () => {
  const prompt = promptFor(6);
  assert.match(prompt, /marchează explicit orice plan, ritm sau soluție adăugată de EWA drept recomandare\/propunere/);
  assert.match(prompt, /etichetează-l explicit drept propunere EWA/);
});

test("named psychological obstacles do not trigger unsolicited motivational reframing", () => {
  const prompt = promptFor(7);
  assert.match(prompt, /Nu diagnostica, nu reformula motivațional/);
  assert.match(prompt, /nu îi spune ce ar trebui să creadă despre sine/);
  assert.match(prompt, /fără reinterpretare psihologică sau încurajări inventate/);
});

test("Creator DNA applies the same discipline and preserves seven sections plus separate why", () => {
  const prompt = creatorDnaPrompt({ sections: [], answers: [] });
  assert.match(prompt.system, /o preferință nu este dovadă de performanță/);
  assert.deepEqual(CREATOR_DNA_KEYS, [
    "creator_identity", "audience", "transformation", "offer", "voice", "content_system", "business_goal"
  ]);
  assert.equal(CREATOR_DNA_KEYS.includes("why"), false);
  assert.match(prompt.system, /Nu crea și nu returna secțiunea «De ce faci asta»/);
});

test("all eight workshops still compose section summary prompts", () => {
  assert.equal(CONTENT.ateliers.length, 8);
  for (const atelier of CONTENT.ateliers) {
    const prompt = sectionSummaryPrompt({ atelier, answers: [{ questionNumber: 1, rawAnswer: "Text" }] });
    assert.match(prompt.system, new RegExp(atelier.summaryInstruction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(prompt.system, /exclusiv prin instrumentul structurat/);
  }
});
