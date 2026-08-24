const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  loadCreatorBlueprint,
  structuredCreatorBlueprint,
  systemPromptWithCreatorBlueprint
} = require("../lib/chat/creatorBlueprintContext");
const { structuredCreatorDna, systemPromptWithCreatorDna } = require("../lib/chat/creatorDnaContext");
const { systemPromptWithWorkingMemory } = require("../lib/chat/workingMemory");

function blueprintClient(result, observed) {
  const query = {
    select(columns) { observed.columns = columns; return query; },
    eq(column, value) { observed.filters.push([column, value]); return query; },
    order(column) { observed.order = column; return Promise.resolve(result); }
  };
  return { from(table) { observed.table = table; return query; } };
}

test("authenticated user's confirmed Blueprint context is loaded by user_id", async () => {
  const observed = { filters: [] };
  const rows = [{ atelier_number: 4, interpreted_summary: "Programul propriu pentru manageri", key_elements: ["serviciu direct"], status: "confirmat" }];
  const blueprint = await loadCreatorBlueprint(blueprintClient({ data: rows, error: null }, observed), "user-42");

  assert.deepEqual(observed, {
    table: "blueprint_sections",
    columns: "atelier_number,interpreted_summary,key_elements,status,confirmed_at",
    filters: [["user_id", "user-42"], ["status", "confirmat"]],
    order: "atelier_number"
  });
  assert.equal(blueprint[0].confirmedSummary, "Programul propriu pentru manageri");
  assert.match(systemPromptWithCreatorBlueprint("base", blueprint), /Programul propriu pentru manageri/);
});

test("no completed Blueprint keeps the existing prompt unchanged", async () => {
  const blueprint = await loadCreatorBlueprint(blueprintClient({ data: [], error: null }, { filters: [] }), "new-user");
  assert.deepEqual(blueprint, []);
  assert.equal(systemPromptWithCreatorBlueprint("existing behavior", blueprint), "existing behavior");
});

test("only confirmed summaries and string key elements are included, without raw answers or Creator DNA's why", () => {
  const context = structuredCreatorBlueprint([
    { atelier_number: 2, status: "confirmat", interpreted_summary: "  Consultanți independenți  ", key_elements: ["audiență validată", 7, ""] },
    { atelier_number: 3, status: "in_desfasurare", interpreted_summary: "Never include", key_elements: [] },
    { atelier_number: 8, status: "confirmat", interpreted_summary: "Motiv personal", key_elements: [] },
    { atelier_number: 4, status: "confirmat", interpreted_summary: "", key_elements: ["orphan"] }
  ]);

  assert.deepEqual(context, [{ atelier: 2, section: "Publicul ales", confirmedSummary: "Consultanți independenți", keyElements: ["audiență validată"] }]);
  assert.equal(JSON.stringify(context).includes("Never include"), false);
  assert.equal(JSON.stringify(context).includes("Motiv personal"), false);
});

test("Blueprint load failure is surfaced by the loader and handled as best-effort by chat", async () => {
  await assert.rejects(
    loadCreatorBlueprint(blueprintClient({ data: null, error: new Error("database unavailable") }, { filters: [] }), "user-a"),
    /database unavailable/
  );
  const chatSource = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  assert.match(chatSource, /try \{\s*creatorBlueprint = await loadCreatorBlueprint\(auth\.client, auth\.user\.id\)/);
  assert.match(chatSource, /catch \(error\) \{\s*console\.error\("Eroare la incarcarea Creator Blueprint/);
  assert.match(chatSource, /systemPromptWithCreatorBlueprint\([\s\S]*creatorBlueprint/);
});

test("Blueprint, Creator DNA, and Working Memory remain separate tagged context layers", () => {
  const dna = structuredCreatorDna({ voice: "Sobru" });
  const blueprint = structuredCreatorBlueprint([{ atelier_number: 4, status: "confirmat", interpreted_summary: "Servicii de consultanță", key_elements: [] }]);
  const prompt = systemPromptWithWorkingMemory(
    systemPromptWithCreatorBlueprint(systemPromptWithCreatorDna("base", dna), blueprint),
    [{ category: "next_action", content: "Trimite propunerea", project_key: "audit" }]
  );

  assert.match(prompt, /<creator_dna>/);
  assert.match(prompt, /<creator_blueprint>/);
  assert.match(prompt, /<working_memory>/);
  assert.match(prompt, /Working Memory > Creator Blueprint > Creator DNA/);
  assert.match(prompt, /Blueprint conține decizii confirmate în ateliere/);
});

test("Blueprint chat context makes no Eworia product or channel assumption", () => {
  const source = readFileSync(join(__dirname, "..", "lib", "chat", "creatorBlueprintContext.js"), "utf8");
  for (const hardcodedAssumption of ["START Kit", "Dincolo de Prompt", "Instagram"]) {
    assert.equal(source.includes(hardcodedAssumption), false);
  }
  const prompt = systemPromptWithCreatorBlueprint("base", [{ atelier: 4, section: "Oferta aleasă", confirmedSummary: "Coaching de carieră" }]);
  assert.match(prompt, /nu o presupunere despre ce promovează utilizatorul/);
  assert.match(prompt, /Nu inventa un produs, un canal, o audiență sau un model de business/);
});
