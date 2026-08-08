const test = require("node:test");
const assert = require("node:assert/strict");
const { SUMMARY_TOOL_NAME, summaryFromResponse, summaryRequestOptions } = require("../lib/blueprint/summaryResponse");

test("summary requests force schema-backed tool output instead of JSON text", () => {
  const options = summaryRequestOptions();
  assert.deepEqual(options.tool_choice, { type: "tool", name: SUMMARY_TOOL_NAME });
  assert.deepEqual(options.tools[0].input_schema.required, ["summary", "keyElements"]);
  assert.equal(options.tools[0].input_schema.additionalProperties, false);
});

test("malformed model JSON text cannot break a valid structured summary", () => {
  const response = [
    { type: "text", text: '{"summary":"A spus "da" fără ezitare","keyElements":["claritate"]}' },
    { type: "tool_use", name: SUMMARY_TOOL_NAME, input: { summary: 'A spus "da" fără ezitare', keyElements: [" claritate ", ""] } }
  ];

  assert.deepEqual(summaryFromResponse(response), {
    summary: 'A spus "da" fără ezitare',
    keyElements: ["claritate"]
  });
});

test("invalid structured summaries are rejected without parsing free-form text", () => {
  assert.throws(
    () => summaryFromResponse([{ type: "text", text: "```json\n{not valid}\n```" }]),
    /invalid structured summary/
  );
});
