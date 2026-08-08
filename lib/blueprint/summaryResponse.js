const SUMMARY_TOOL_NAME = "return_blueprint_summary";

const SUMMARY_TOOL = Object.freeze({
  name: SUMMARY_TOOL_NAME,
  description: "Returnează rezumatul structurat al atelierului Creator Blueprint.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Rezumatul atelierului în limba română." },
      keyElements: {
        type: "array",
        items: { type: "string" },
        description: "Elementele esențiale identificate în răspunsuri."
      }
    },
    required: ["summary", "keyElements"],
    additionalProperties: false
  }
});

function summaryRequestOptions() {
  return {
    tools: [SUMMARY_TOOL],
    tool_choice: { type: "tool", name: SUMMARY_TOOL_NAME }
  };
}

function summaryFromResponse(content) {
  const input = content?.find(item => item.type === "tool_use" && item.name === SUMMARY_TOOL_NAME)?.input;
  if (typeof input?.summary !== "string" || !input.summary.trim() || !Array.isArray(input.keyElements) || input.keyElements.some(item => typeof item !== "string")) {
    throw new Error("Anthropic returned an invalid structured summary");
  }
  return { summary: input.summary.trim(), keyElements: input.keyElements.map(item => item.trim()).filter(Boolean) };
}

module.exports = { SUMMARY_TOOL_NAME, SUMMARY_TOOL, summaryRequestOptions, summaryFromResponse };
