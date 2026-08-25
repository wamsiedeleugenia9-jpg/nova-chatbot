const test = require("node:test");
const assert = require("node:assert/strict");
const { SUMMARY_TOOL_NAME, summaryFromResponse, summaryRequestOptions, summaryResponseDiagnostics } = require("../lib/blueprint/summaryResponse");

test("summary requests force schema-backed tool output instead of JSON text", () => {
  const options = summaryRequestOptions();
  assert.deepEqual(options.tool_choice, { type: "tool", name: SUMMARY_TOOL_NAME });
  assert.deepEqual(options.tools[0].input_schema.required, ["summary", "keyElements"]);
  assert.equal(options.tools[0].input_schema.additionalProperties, false);
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
