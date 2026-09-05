const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { claimChatRequest, completeChatRequest, loadChatContext, loadChatHistory } = require("../lib/chat/history");

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

test("logical requests are claimed and completed through RPCs with no user id argument", async () => {
  let call;
  const client = { async rpc(name, values) { call = [name, values]; return { data: "conversation-a", error: null }; } };
  assert.equal(await claimChatRequest(client, "request-a", "Mesaj"), "conversation-a");
  assert.deepEqual(call, ["claim_ewa_chat_request", { p_request_id: "request-a", p_user_message: "Mesaj" }]);
  assert.equal(await completeChatRequest(client, "request-a", "Mesaj", "Raspuns"), "conversation-a");
  assert.deepEqual(call, ["complete_ewa_chat_request", { p_request_id: "request-a", p_user_message: "Mesaj", p_assistant_message: "Raspuns" }]);
  assert.equal("user_id" in call[1], false);
});

test("an assistant response longer than 4000 characters is persisted without truncation", async () => {
  const assistantMessage = "R".repeat(4001);
  let persisted;
  const client = {
    async rpc(name, values) {
      persisted = [name, values];
      return { data: "conversation-a", error: null };
    }
  };

  assert.equal(await completeChatRequest(client, "request-a", "Mesaj", assistantMessage), "conversation-a");
  assert.equal(persisted[1].p_assistant_message, assistantMessage);
  assert.equal(persisted[1].p_assistant_message.length, 4001);
});

test("storage migration keeps the user limit and removes the assistant upper limit", () => {
  const migration = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260905000000_expand_ewa_assistant_messages.sql"), "utf8");
  assert.match(migration, /role = 'user' and char_length\(content\) between 1 and 4000/);
  assert.match(migration, /role = 'assistant' and char_length\(content\) >= 1/);
  assert.match(migration, /p_user_message is null or char_length\(p_user_message\) not between 1 and 4000/);
  assert.match(migration, /p_assistant_message is null or char_length\(p_assistant_message\) < 1/);
  assert.doesNotMatch(migration, /char_length\(p_assistant_message\) not between 1 and 4000/);
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
  const restoreHistory = readFileSync(join(__dirname, "..", "lib", "chat", "restoreHistory.js"), "utf8");
  assert.match(api, /req\.method === "GET"[\s\S]*loadChatHistory\(auth\.client, auth\.user\.id\)/);
  assert.match(api, /loadChatContext\(auth\.client, auth\.user\.id\)/);
  assert.match(api, /messages = \[\.\.\.history, \{ role: "user", content: message \}\]/);
  assert.match(api, /await completeChatRequest\(auth\.client, requestId, message, reply\)/);
  assert.doesNotMatch(api, /const \{ messages \} = req\.body/);
  assert.match(page, /const requestId = crypto\.randomUUID\(\)/);
  assert.match(page, /body: JSON\.stringify\(\{ message: msg, requestId \}\)/);
  assert.match(restoreHistory, /messages: history\.messages/);
  assert.match(page, /result\.messages\.length \? result\.messages : \[WELCOME_MESSAGE\]/);
  assert.match(page, /setMessages\(\[\]\);[\s\S]*await supabase\.auth\.signOut\(\)/);
});

test("system prompt treats supplied previous-session free chat as bounded private conversational continuity", () => {
  const api = readFileSync(join(__dirname, "..", "pages", "api", "chat.js"), "utf8");
  assert.match(api, /Mesajele de conversatie libera furnizate in array-ul Anthropic \\\`messages\\\` reprezinta istoricul persistent disponibil al utilizatorului autentificat/);
  assert.match(api, /pot proveni din sesiuni anterioare de browser sau autentificare; limitele dintre sesiuni nu fac indisponibile mesajele care au fost furnizate/);
  assert.match(api, /Daca o informatie exista in aceste mesaje[\s\S]*nu afirma ca istoricul conversatiilor libere din sesiunile anterioare nu este disponibil/);
  assert.match(api, /Ai acces numai la istoricul inclus in contextul curent, nu la toate conversatiile istorice/);
  assert.match(api, /Daca informatia nu exista in mesajele furnizate, Creator Blueprint, Creator DNA sau Working Memory, nu pretinde ca ti-o amintesti/);
  assert.match(api, /apartine exclusiv utilizatorului autentificat; nu sugera niciodata acces la conversatiile altui utilizator/);
  assert.match(api, /nu explica arhitectura interna decat daca ti se cere explicit[\s\S]*evita termenii interni inutili/);
});
