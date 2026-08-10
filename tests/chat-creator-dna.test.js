const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadCreatorDna, structuredCreatorDna, systemPromptWithCreatorDna } = require("../lib/chat/creatorDnaContext");

const sections = {
  creator_identity: "Educatoare pentru creatori",
  audience: "Mame la început de drum",
  transformation: "De la confuzie la un plan clar",
  offer: "Program practic",
  voice: "Caldă și directă",
  content_system: "Trei postări educative pe săptămână",
  business_goal: "Lansarea primei cohorte",
  why: "Mai mult timp cu familia"
};

function clientReturning(result, observed) {
  return {
    from(table) {
      observed.table = table;
      return {
        select(columns) {
          observed.columns = columns;
          return {
            eq(column, value) {
              observed.filter = [column, value];
              return { maybeSingle: async () => result };
            }
          };
        }
      };
    }
  };
}

test("authenticated user's structured Creator DNA is loaded by user_id", async () => {
  const observed = {};
  const dna = await loadCreatorDna(clientReturning({ data: { sections }, error: null }, observed), "user-a");
  assert.deepEqual(observed, { table: "creator_dna", columns: "sections", filter: ["user_id", "user-a"] });
  assert.equal(dna["Vocea creatorului"], sections.voice);
  assert.equal(dna["De ce construiește businessul"], sections.why);
});

test("authenticated user without Creator DNA retains the existing system prompt", async () => {
  const dna = await loadCreatorDna(clientReturning({ data: null, error: null }, {}), "new-user");
  assert.equal(dna, null);
  assert.equal(systemPromptWithCreatorDna("existing behavior", dna), "existing behavior");
});

test("structured sections parsing accepts known non-empty strings and ignores legacy or malformed values", () => {
  assert.deepEqual(structuredCreatorDna({ voice: "  Directă  ", audience: "Mame", legacy_text: "ignore", offer: null }), {
    "Pentru cine creează": "Mame",
    "Vocea creatorului": "Directă"
  });
  assert.equal(structuredCreatorDna(null), null);
  assert.equal(structuredCreatorDna([]), null);
  assert.equal(structuredCreatorDna({ voice: " " }), null);
});

test("Creator DNA queries are isolated between users", async () => {
  const first = {};
  const second = {};
  await loadCreatorDna(clientReturning({ data: null, error: null }, first), "user-a");
  await loadCreatorDna(clientReturning({ data: null, error: null }, second), "user-b");
  assert.deepEqual(first.filter, ["user_id", "user-a"]);
  assert.deepEqual(second.filter, ["user_id", "user-b"]);
  assert.notDeepEqual(first.filter, second.filter);
});

test("Supabase failures are surfaced by the loader and chat handles them gracefully", async () => {
  await assert.rejects(
    loadCreatorDna(clientReturning({ data: null, error: new Error("database unavailable") }, {}), "user-a"),
    /database unavailable/
  );
  const chatSource = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  assert.match(chatSource, /try \{\s*creatorDna = await loadCreatorDna/);
  assert.match(chatSource, /catch \(error\) \{\s*console\.error\("Eroare la incarcarea Creator DNA/);
  assert.match(chatSource, /systemPromptWithCreatorDna\(SYSTEM_PROMPT, creatorDna\)/);
});

test("injected context guides personalization without disclosure or diagnosis", () => {
  const prompt = systemPromptWithCreatorDna("base", structuredCreatorDna(sections));
  assert.match(prompt, /Caldă și directă/);
  assert.match(prompt, /Nu repeta, nu enumera și nu expune/);
  assert.match(prompt, /Nu cere din nou informațiile deja prezente/);
  assert.match(prompt, /nu diagnostic psihologic/);
  assert.match(prompt, /lipsă de cunoștințe/);
  assert.match(prompt, /întrebări reflective/);
});
