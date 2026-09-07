const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { CHAT_LENGTH_LIMIT_NOTICE, formatMainChatResponse } = require("../lib/chat/mainResponse");

const api = readFileSync(join(__dirname, "..", "pages/api/chat.js"), "utf8");

test("natural end_turn completion keeps the model response unchanged", () => {
  assert.deepEqual(
    formatMainChatResponse({ stop_reason: "end_turn", content: [{ type: "text", text: "Raspuns complet." }] }),
    { isTruncated: false, reply: "Raspuns complet." }
  );
});

test("max_tokens completion preserves partial text and clearly marks it", () => {
  const result = formatMainChatResponse({
    stop_reason: "max_tokens",
    content: [{ type: "text", text: "Text partial V" }]
  });

  assert.equal(result.isTruncated, true);
  assert.equal(result.reply, `Text partial V\n\n${CHAT_LENGTH_LIMIT_NOTICE}`);
  assert.match(result.reply, /limita de lungime/i);
  assert.match(result.reply, /continui/i);
});

test("main request persists the marked reply, completes it, and skips memory extraction when truncated", () => {
  assert.match(api, /const \{ reply, isTruncated \} = formatMainChatResponse\(data\)/);
  assert.match(api, /await completeChatRequest\(auth\.client, requestId, message, reply\)/);
  assert.match(api, /if \(!isTruncated\) \{[\s\S]*memoryExtractionRequest\(latestUserMessage, reply\)/);

  const completion = api.indexOf("await completeChatRequest(auth.client, requestId, message, reply)");
  const memoryGuard = api.indexOf("if (!isTruncated) {");
  assert.ok(completion > -1 && memoryGuard > completion);
});

test("main chat uses the larger cap and includes concise-response guidance", () => {
  assert.match(api, /max_tokens: 1500/);
  assert.doesNotMatch(api, /max_tokens: 1000/);
  assert.match(api, /Raspunde direct cererii curente si prioritizeaza urmatorul pas util/);
  assert.match(api, /Evita repetitiile inutile si listele supradimensionate/);
  assert.match(api, /Nu scurta artificial un livrabil detaliat cerut de utilizator/);
});

test("truncation adds no continuation call and replay still exits before Anthropic", () => {
  assert.equal((api.match(/api\.anthropic\.com\/v1\/messages/g) || []).length, 2);
  const replay = api.indexOf('claim.status === "completed"');
  const processing = api.indexOf('claim.status === "processing"');
  const mainCall = api.indexOf('fetch("https://api.anthropic.com/v1/messages"');
  assert.ok(replay > -1 && processing > replay && mainCall > processing);
  assert.match(api, /claim\.status === "completed"\) return res\.status\(200\)\.json\(\{ reply: claim\.reply \}\)/);
});
