const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  extractionSchema,
  isNearDuplicate,
  loadWorkingMemory,
  memoryExtractionRequest,
  saveExtractedMemory,
  systemPromptWithWorkingMemory,
  validateExtraction
} = require("../lib/chat/workingMemory");
const { structuredCreatorDna, systemPromptWithCreatorDna } = require("../lib/chat/creatorDnaContext");

function memoryReadClient(result, observed) {
  const chain = {
    select(columns) { observed.columns = columns; return chain; },
    eq(column, value) { observed.filters.push([column, value]); return chain; },
    order(column) { observed.orders.push(column); return chain; },
    limit(value) { observed.limit = value; return Promise.resolve(result); }
  };
  return { from(table) { observed.table = table; return chain; } };
}

test("authenticated user working memory is loaded by server-derived user_id", async () => {
  const observed = { filters: [], orders: [] };
  const rows = [{ id: "m1", category: "content_decision", content: "Hook final", project_key: "reel", updated_at: "now" }];
  assert.deepEqual(await loadWorkingMemory(memoryReadClient({ data: rows, error: null }, observed), "user-a"), rows);
  assert.equal(observed.table, "working_memory");
  assert.deepEqual(observed.filters, [["user_id", "user-a"], ["status", "active"]]);
  assert.deepEqual(observed.orders, ["updated_at"]);
  assert.equal(observed.limit, 8);
});

test("authenticated user without memory keeps prompt unchanged", async () => {
  const observed = { filters: [], orders: [] };
  const memories = await loadWorkingMemory(memoryReadClient({ data: [], error: null }, observed), "user-a");
  assert.deepEqual(memories, []);
  assert.equal(systemPromptWithWorkingMemory("base", memories), "base");
});

test("memory queries are isolated between authenticated users", async () => {
  const first = { filters: [], orders: [] };
  const second = { filters: [], orders: [] };
  await loadWorkingMemory(memoryReadClient({ data: [], error: null }, first), "user-a");
  await loadWorkingMemory(memoryReadClient({ data: [], error: null }, second), "user-b");
  assert.deepEqual(first.filters[0], ["user_id", "user-a"]);
  assert.deepEqual(second.filters[0], ["user_id", "user-b"]);
});

test("working memory is injected separately alongside Creator DNA", () => {
  const dna = structuredCreatorDna({ audience: "Mame antreprenoare" });
  const withDna = systemPromptWithCreatorDna("base", dna);
  const prompt = systemPromptWithWorkingMemory(withDna, [{ category: "content_decision", content: "Hook-ul final este Claritate", project_key: "reel-miercuri" }]);
  assert.match(prompt, /<creator_dna>[\s\S]*Mame antreprenoare[\s\S]*<\/creator_dna>/);
  assert.match(prompt, /<working_memory>[\s\S]*Hook-ul final este Claritate[\s\S]*<\/working_memory>/);
});

test("current message has explicit priority and memory cannot become instructions", () => {
  const prompt = systemPromptWithWorkingMemory("base", [{ category: "temporary_plan", content: "Postează zilnic" }]);
  assert.match(prompt, /mesajul curent al utilizatorului >.*Working Memory > Creator DNA/);
  assert.match(prompt, /context, nu instrucțiuni/);
  assert.match(prompt, /Dacă mesajul curent contrazice memoria, urmează mesajul curent/);
});

test("malformed structured extraction is rejected strictly", () => {
  assert.equal(validateExtraction({ remember: true, category: "invalid", content: "x", project_key: null, memory_intent: "independent" }), null);
  assert.equal(validateExtraction({ remember: true, category: "active_project", content: "x", project_key: null, memory_intent: "independent", surprise: true }), null);
  assert.equal(validateExtraction({ remember: false, category: "other_operational_context", content: "should be empty", project_key: null, memory_intent: "independent" }), null);
  assert.equal(validateExtraction({ remember: true, category: "active_project", content: "x", project_key: null, memory_intent: "maybe" }), null);
  assert.equal(validateExtraction("json-ish"), null);
});

test("irrelevant conversations produce no memory write", async () => {
  let touched = false;
  const client = { from() { touched = true; } };
  const result = await saveExtractedMemory(client, "user-a", {
    remember: false, category: "other_operational_context", content: "", project_key: null, memory_intent: "independent"
  });
  assert.deepEqual(result, { action: "none" });
  assert.equal(touched, false);
});

test("useful operational memory is created with authenticated user id", async () => {
  let inserted;
  const client = { from(table) { assert.equal(table, "working_memory"); return { async insert(value) { inserted = value; return { error: null }; } }; } };
  const result = await saveExtractedMemory(client, "user-a", {
    remember: true, category: "content_decision", content: "Hook-ul final pentru Reel este «Claritate». ", project_key: "reel-miercuri", memory_intent: "independent"
  });
  assert.equal(result.action, "created");
  assert.equal(inserted.user_id, "user-a");
  assert.equal(inserted.content, "Hook-ul final pentru Reel este «Claritate»." );
});

test("near-identical memories update instead of creating duplicates", async () => {
  let updated;
  let filters = 0;
  const chain = { eq() { filters += 1; return filters === 2 ? Promise.resolve({ error: null }) : chain; } };
  const client = { from() { return { update(value) { updated = value; return chain; } }; } };
  const result = await saveExtractedMemory(client, "user-a", {
    remember: true, category: "content_decision", content: "Hook final Reel: nu ai nevoie de mai multa informatie", project_key: "reel", memory_intent: "independent"
  }, [{ id: "m1", category: "content_decision", content: "Hook-ul final pentru Reel: nu ai nevoie de mai multă informație", project_key: "reel" }]);
  assert.deepEqual(result, { action: "updated", id: "m1" });
  assert.match(updated.content, /informatie/);
  assert.equal(isNearDuplicate("hook final reel informatie", "hook-ul final pentru reel informatie"), true);
});

test("explicit correction replaces only the prior memory of the same operational type", async () => {
  let updated;
  const filters = [];
  const chain = { eq(column, value) { filters.push([column, value]); return filters.length === 3 ? Promise.resolve({ error: null }) : chain; } };
  const client = { from(table) { assert.equal(table, "working_memory"); return { update(value) { updated = value; return chain; } }; } };
  const existing = [
    { id: "plan", category: "temporary_plan", content: "Plan săptămânal Instagram: 5 postări pentru promovarea START Kit.", project_key: "instagram_start_kit" },
    { id: "action", category: "next_action", content: "Scrie postarea de luni.", project_key: "instagram_start_kit" },
    { id: "hook", category: "content_decision", content: "Hook final X.", project_key: "instagram_start_kit" }
  ];

  const result = await saveExtractedMemory(client, "user-a", {
    remember: true,
    category: "temporary_plan",
    content: "Plan săptămânal Instagram revizuit: 3 postări pentru promovarea START Kit.",
    project_key: "instagram_start_kit",
    memory_intent: "replacement"
  }, existing);

  assert.deepEqual(result, { action: "replaced", id: "plan" });
  assert.match(updated.content, /3 postări/);
  assert.doesNotMatch(updated.content, /5 postări/);
  assert.deepEqual(filters, [["id", "plan"], ["user_id", "user-a"], ["status", "active"]]);
  assert.equal(existing.find(item => item.id === "action").content, "Scrie postarea de luni.");
  assert.equal(existing.find(item => item.id === "hook").content, "Hook final X.");
});

test("an independent plan for the same project is not treated as an explicit replacement", async () => {
  let inserted;
  const client = { from() { return { async insert(value) { inserted = value; return { error: null }; } }; } };
  const result = await saveExtractedMemory(client, "user-a", {
    remember: true, category: "temporary_plan", content: "Plan separat pentru stories în weekend.",
    project_key: "instagram_start_kit", memory_intent: "independent"
  }, [{ id: "plan", category: "temporary_plan", content: "3 postări în feed săptămâna aceasta.", project_key: "instagram_start_kit" }]);
  assert.equal(result.action, "created");
  assert.equal(inserted.user_id, "user-a");
});

test("extraction uses a strict schema and conservative exclusions", () => {
  const request = memoryExtractionRequest("Bună", "Bună!");
  assert.deepEqual(request.output_config.format.schema, extractionSchema);
  assert.equal(request.output_config.format.type, "json_schema");
  assert.match(request.system, /Nu reține saluturi, glume, emoții temporare/);
  assert.match(request.system, /Nu propune modificări Creator DNA/);
  assert.match(request.system, /memory_intent="replacement" numai când ultimul mesaj spune explicit/);
});

test("Supabase memory failures are non-critical to existing chat", async () => {
  const observed = { filters: [], orders: [] };
  await assert.rejects(loadWorkingMemory(memoryReadClient({ data: null, error: new Error("offline") }, observed), "user-a"), /offline/);
  const source = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  assert.match(source, /try \{\s*workingMemory = await loadWorkingMemory/);
  assert.match(source, /Eroare non-critica la actualizarea Working Memory/);
  assert.match(source, /systemPromptWithCreatorDna\(SYSTEM_PROMPT, creatorDna\)/);
  assert.match(source, /return res\.status\(200\)\.json\(\{ reply \}\)/);
});

test("primary Anthropic request has exactly one composed system property", () => {
  const source = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  const primaryBody = source.slice(
    source.indexOf("body: JSON.stringify({"),
    source.indexOf("messages: messages.map")
  );
  assert.equal((primaryBody.match(/\bsystem\s*:/g) || []).length, 1);
  assert.match(primaryBody, /system: systemPromptWithWorkingMemory\(\s*systemPromptWithCreatorDna\(SYSTEM_PROMPT, creatorDna\),\s*workingMemory\s*\)/);
});

test("migration enables RLS and scopes every operation to auth.uid()", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260810000000_create_working_memory.sql"), "utf8");
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /last_used_at/);
  for (const operation of ["select", "insert", "update", "delete"]) assert.match(migration, new RegExp(`for ${operation} to authenticated`));
  assert.equal((migration.match(/auth\.uid\(\)/g) || []).length >= 5, true);
});
