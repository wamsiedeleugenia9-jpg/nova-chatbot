const test = require("node:test");
const assert = require("node:assert/strict");
const { SUMMARY_TOKEN_BUDGETS, SUMMARY_TOOL_NAME, summaryFromResponse, summaryRequestOptions, summaryResponseDiagnostics, summaryWithRetry } = require("../lib/blueprint/summaryResponse");

test("summary requests force schema-backed tool output instead of JSON text", () => {
  const options = summaryRequestOptions();
  assert.deepEqual(options.tool_choice, { type: "tool", name: SUMMARY_TOOL_NAME });
  assert.deepEqual(options.tools[0].input_schema.required, ["summary", "keyElements"]);
  assert.equal(options.tools[0].input_schema.additionalProperties, false);
  assert.equal(options.tools[0].input_schema.properties.keyElements.maxItems, 8);
  assert.equal(options.tools[0].input_schema.properties.keyElements.items.maxLength, 240);
});

test("structured summaries use a larger retry budget", () => {
  assert.deepEqual(SUMMARY_TOKEN_BUDGETS, [1600, 2600]);
});

test("malformed model JSON text cannot break a valid structured summary", () => {
  const response = [
    { type: "text", text: '{"summary":"A spus "da" fără ezitare","keyElements":["claritate"]}' },
    { type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: 'A spus "da" fără ezitare', keyElements: [" claritate "] } }
  ];

  assert.deepEqual(summaryFromResponse(response), {
    summary: 'A spus "da" fără ezitare',
    keyElements: ["claritate"]
  });
});

test("accepts a full Anthropic response with the legacy snake-case key variation", () => {
  const response = {
    stop_reason: "tool_use",
    content: [{
      type: "tool_use",
      id: "toolu_01ProductionSummary",
      name: SUMMARY_TOOL_NAME,
      input: {
        summary: "Atelierul clarifică direcția creatoarei.",
        key_elements: [" direcție clară ", "public potrivit"]
      }
    }]
  };

  assert.deepEqual(summaryFromResponse(response), {
    summary: "Atelierul clarifică direcția creatoarei.",
    keyElements: ["direcție clară", "public potrivit"]
  });
});

test("invalid structured summaries are rejected without parsing free-form text", () => {
  assert.throws(
    () => summaryFromResponse([{ type: "text", text: "```json\n{not valid}\n```" }]),
    /missing_tool_use/
  );
});

test("structured summary failures identify the exact safe diagnostic category", () => {
  assert.throws(
    () => summaryFromResponse([{ type: "tool_use", name: "another_tool", input: {} }]),
    error => error.code === "INVALID_SUMMARY_RESPONSE" && error.reason === "wrong_tool_name"
  );
  assert.throws(
    () => summaryFromResponse([{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { keyElements: [] } }]),
    error => error.reason === "missing_summary"
  );
  assert.throws(
    () => summaryFromResponse([{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: "Rezumat", keyElements: [""] } }]),
    error => error.reason === "invalid_keyElements"
  );
});

test("max_tokens is rejected explicitly as truncation before incomplete keyElements validation", () => {
  assert.throws(
    () => summaryFromResponse({
      stop_reason: "max_tokens",
      content: [{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: "Rezumat", keyElements: ["element", ""] } }]
    }),
    error => error.code === "INVALID_SUMMARY_RESPONSE" && error.reason === "truncated_structured_response"
  );
});

test("truncated structured output retries once with the larger budget and accepts a complete response", async () => {
  const budgets = [];
  const diagnostics = [];
  const responses = [
    { stop_reason: "max_tokens", content: [{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: "Preț actualizat", keyElements: ["preț ales:"] } }] },
    { stop_reason: "tool_use", content: [{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: "Prețul ales a fost actualizat de la 150 EUR la 175 EUR.", keyElements: ["preț anterior: 150 EUR", "preț ales: 175 EUR", "alegerea nu validează piața"] } }] }
  ];

  const result = await summaryWithRetry(async budget => {
    budgets.push(budget);
    return responses.shift();
  }, item => diagnostics.push(item));

  assert.deepEqual(budgets, [1600, 2600]);
  assert.equal(diagnostics[0].reason, "truncated_structured_response");
  assert.deepEqual(result, {
    summary: "Prețul ales a fost actualizat de la 150 EUR la 175 EUR.",
    keyElements: ["preț anterior: 150 EUR", "preț ales: 175 EUR", "alegerea nu validează piața"]
  });
});

test("overlong structured keyElements remain rejected", () => {
  assert.throws(
    () => summaryFromResponse([{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: "Rezumat", keyElements: Array(9).fill("element") } }]),
    error => error.reason === "invalid_keyElements"
  );
});

test("Workshop 4 price edit from 150 EUR to 175 EUR completes through structured parsing", () => {
  const anthropicResponse = {
    stop_reason: "tool_use",
    content: [{
      type: "tool_use",
      id: "toolu_workshop_4_price_edit",
      name: SUMMARY_TOOL_NAME,
      input: {
        summary: "Creatoarea a ales prețul de 175 EUR; alegerea nu reprezintă validare de piață.",
        keyElements: ["preț ales: 175 EUR", "validarea pieței nu este încă demonstrată"]
      }
    }]
  };

  assert.deepEqual(summaryFromResponse(anthropicResponse), {
    summary: "Creatoarea a ales prețul de 175 EUR; alegerea nu reprezintă validare de piață.",
    keyElements: ["preț ales: 175 EUR", "validarea pieței nu este încă demonstrată"]
  });
});

test("response diagnostics expose structure but never summary contents", () => {
  assert.deepEqual(summaryResponseDiagnostics({
    stop_reason: "max_tokens",
    content: [{ type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: "secret", keyElements: [] } }]
  }), {
    stopReason: "max_tokens",
    contentType: "array",
    blocks: [{ type: "tool_use", name: SUMMARY_TOOL_NAME, inputType: "object", inputKeys: ["keyElements", "summary"] }]
  });
});
