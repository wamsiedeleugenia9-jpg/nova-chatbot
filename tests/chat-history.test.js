const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadChatContext, loadChatHistory, saveChatExchange } = require("../lib/chat/history");

function conversationClient(conversation, messages) {
  const observed = [];
  return {
    observed,
    from(table) {
      const query = {
        select(columns) { observed.push([table, "select", columns]); return query; },
        eq(column, value) { observed.push([table, "eq", column, value]); return query; },
        maybeSingle() { return Promise.resolve({ data: conversation, error: null }); },
        order(column, options) {
          observed.push([table, "order", column, options]);
          return table === "ewa_messages" ? Promise.resolve({ data: messages, error: null }) : query;
        }
      };
      return query;
    }
  };
}

test("history is loaded only through the server-derived user and conversation ids", async () => {
  const client = conversationClient({ id: "conversation-a" }, [{ role: "user", content: "Salut" }]);
  assert.deepEqual(await loadChatHistory(client, "user-a"), [{ role: "user", content: "Salut" }]);
  assert.deepEqual(client.observed.filter(item => item[1] === "eq"), [
    ["ewa_conversations", "eq", "user_id", "user-a"],
    ["ewa_messages", "eq", "user_id", "user-a"],
    ["ewa_messages", "eq", "conversation_id", "conversation-a"]
  ]);
});

test("a user without a persisted conversation receives an empty history", async () => {
  const client = conversationClient(null, []);
  assert.deepEqual(await loadChatHistory(client, "user-a"), []);
  assert.equal(client.observed.some(item => item[0] === "ewa_messages"), false);
});

test("Anthropic context uses the latest persisted messages in chronological order", async () => {
  const observed = [];
  const descending = [{ role: "assistant", content: "Raspuns" }, { role: "user", content: "Intrebare" }];
  const client = {
    from(table) {
      const query = {
        select() { return query; },
        eq(column, value) { observed.push([table, column, value]); return query; },
        maybeSingle() { return Promise.resolve({ data: { id: "conversation-a" }, error: null }); },
        order(column, options) { observed.push([table, column, options]); return query; },
        limit(value) { observed.push([table, "limit", value]); return Promise.resolve({ data: descending, error: null }); }
      };
      return query;
    }
  };
  assert.deepEqual(await loadChatContext(client, "user-a"), [
    { role: "user", content: "Intrebare" },
    { role: "assistant", content: "Raspuns" }
  ]);
  assert.ok(observed.some(item => item[0] === "ewa_messages" && item[1] === "limit" && item[2] === 39));
});

test("completed exchanges are written through an RPC with no user id argument", async () => {
  let call;
  const client = { async rpc(name, values) { call = [name, values]; return { data: "conversation-a", error: null }; } };
  assert.equal(await saveChatExchange(client, "Mesaj", "Raspuns"), "conversation-a");
  assert.deepEqual(call, ["save_ewa_chat_exchange", { p_user_message: "Mesaj", p_assistant_message: "Raspuns" }]);
  assert.equal("user_id" in call[1], false);
});

test("migration enforces one RLS-isolated conversation per authenticated user", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260826000000_create_ewa_chat_history.sql"), "utf8");
  assert.match(migration, /constraint ewa_conversations_user_id_key unique \(user_id\)/);
  assert.match(migration, /foreign key \(conversation_id, user_id\)[\s\S]*references public\.ewa_conversations \(id, user_id\)/);
  assert.equal((migration.match(/enable row level security/g) || []).length, 2);
  for (const table of ["ewa_conversations", "ewa_messages"]) {
    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(migration, new RegExp(`on public\\.${table} for ${operation} to authenticated`));
    }
  }
  assert.equal((migration.match(/auth\.uid\(\)/g) || []).length >= 11, true);
  assert.doesNotMatch(migration, /user_roles|admin/);
});

test("atomic persistence derives ownership from auth.uid and cannot receive a user id", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260826000000_create_ewa_chat_history.sql"), "utf8");
  const signature = migration.slice(migration.indexOf("create or replace function"), migration.indexOf("returns uuid"));
  assert.doesNotMatch(signature, /user_id/);
  assert.match(migration, /current_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /revoke all on function public\.save_ewa_chat_exchange\(text, text\) from anon/);
  assert.match(migration, /grant execute on function public\.save_ewa_chat_exchange\(text, text\) to authenticated/);
});

test("web API loads canonical history and accepts only the latest client message", () => {
  const api = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  const page = readFileSync(join(__dirname, "..", "pages", "index.jsx"), "utf8");
  assert.match(api, /req\.method === "GET"[\s\S]*loadChatHistory\(auth\.client, auth\.user\.id\)/);
  assert.match(api, /loadChatContext\(auth\.client, auth\.user\.id\)/);
  assert.match(api, /messages = \[\.\.\.history, \{ role: "user", content: message \}\]/);
  assert.match(api, /await saveChatExchange\(auth\.client, message, reply\)/);
  assert.doesNotMatch(api, /const \{ messages \} = req\.body/);
  assert.match(page, /body: JSON\.stringify\(\{ message: msg \}\)/);
  assert.match(page, /payload\.messages\.length \? payload\.messages : \[WELCOME_MESSAGE\]/);
  assert.match(page, /setMessages\(\[\]\);[\s\S]*await supabase\.auth\.signOut\(\)/);
});

test("system prompt treats supplied persisted history as private conversational continuity", () => {
  const api = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  assert.match(api, /istoricul persistent din sesiunile autentificate anterioare ale aceluiasi utilizator/);
  assert.match(api, /nu sustine ca nu ai acces la o sesiune anterioara cand raspunsul exista in context/);
  assert.match(api, /Nu pretinde ca iti amintesti informatii absente[\s\S]*nu sugera niciodata acces la conversatiile altui utilizator/);
});
