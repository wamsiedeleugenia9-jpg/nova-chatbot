const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { EWA_CORE_BEHAVIOR } = require("../lib/prompts/ewaCoreBehavior");

test("EWA core behavior distinguishes the four useful obstacle states", () => {
  assert.match(EWA_CORE_BEHAVIOR, /CUNOASTERE/);
  assert.match(EWA_CORE_BEHAVIOR, /CLARITATE/);
  assert.match(EWA_CORE_BEHAVIOR, /OBSTACOL IN ACTIUNE/);
  assert.match(EWA_CORE_BEHAVIOR, /FEEDBACK DUPA ACTIUNE/);
});

test("EWA core behavior protects user autonomy and avoids automatic psychologizing", () => {
  assert.match(EWA_CORE_BEHAVIOR, /Nu diagnostica utilizatorul/);
  assert.match(EWA_CORE_BEHAVIOR, /Nu interpreta persoana/);
  assert.match(EWA_CORE_BEHAVIOR, /Nu presupune existenta unei convingeri limitative/);
  assert.match(EWA_CORE_BEHAVIOR, /Nu transforma automat o problema practica intr-una psihologica/);
});

test("EWA does not infer unsupported motivations or circumstances", () => {
  assert.match(
    EWA_CORE_BEHAVIOR,
    /Nu inventa motivatii, motive, emotii, constrangeri sau circumstante pe care utilizatorul nu le-a exprimat/
  );
});

test("EWA reassesses recommendations after a material constraint change", () => {
  assert.match(EWA_CORE_BEHAVIOR, /o constrangere schimbata poate modifica material recomandarea/);
  assert.match(EWA_CORE_BEHAVIOR, /reevalueaza recomandarea pornind de la obiectivul si contextul actual/);
  assert.match(EWA_CORE_BEHAVIOR, /nu doar micsora sau adapta mecanic planul anterior/);
});

test("EWA preserves an explicit user correction as the current context", () => {
  assert.match(EWA_CORE_BEHAVIOR, /corectie explicita a utilizatorului ca fiind autoritara/);
  assert.match(EWA_CORE_BEHAVIOR, /inlocuieste informatia contrazisa in contextul de lucru/);
  assert.match(EWA_CORE_BEHAVIOR, /nu reveni la ea ca premisa curenta/);
});

test("EWA proceeds without unnecessary clarification when context is sufficient", () => {
  assert.match(EWA_CORE_BEHAVIOR, /o singura intrebare concisa/);
  assert.match(EWA_CORE_BEHAVIOR, /informatia lipsa ar schimba material recomandarea/);
  assert.match(EWA_CORE_BEHAVIOR, /continua direct, fara clarificari inutile/);
});

test("EWA specializes for domain experts who may be beginners in marketing", () => {
  assert.match(EWA_CORE_BEHAVIOR, /expertiza profesionala de experienta in marketing/);
  assert.match(EWA_CORE_BEHAVIOR, /incepator complet in social media/);
  assert.match(EWA_CORE_BEHAVIOR, /nu stie ce nu stie/);
  assert.match(EWA_CORE_BEHAVIOR, /urmatorul pas util/);
});

test("chat composes the specialized core and removes obsolete product catalog", () => {
  const source = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  assert.match(source, /EWA_CORE_BEHAVIOR/);
  assert.match(source, /systemPromptWithCreatorDna\(SYSTEM_PROMPT, creatorDna\)/);
  assert.match(source, /systemPromptWithWorkingMemory/);
  assert.doesNotMatch(source, /Academia AI/);
  assert.doesNotMatch(source, /Elite Digital Course/);
  assert.doesNotMatch(source, /Pachet Business Premium/);
  assert.doesNotMatch(source, /Mindful Messaging/);
});
