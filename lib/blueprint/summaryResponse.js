const SUMMARY_TOOL_NAME = "return_blueprint_summary";
const SUMMARY_TOKEN_BUDGETS = Object.freeze([1600, 2600]);

const SUMMARY_TOOL = Object.freeze({
  name: SUMMARY_TOOL_NAME,
  description: "Returnează rezumatul structurat al atelierului Creator Blueprint.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Rezumatul atelierului în limba română." },
      keyElements: {
        type: "array",
        items: { type: "string", minLength: 1, maxLength: 240 },
        maxItems: 8,
        description: "Între 3 și 8 elemente esențiale, concise, identificate în răspunsuri."
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

function invalidSummary(reason) {
  const error = new Error(`Anthropic returned an invalid structured summary: ${reason}`);
  error.code = "INVALID_SUMMARY_RESPONSE";
  error.reason = reason;
  return error;
}

function summaryResponseDiagnostics(response) {
  const content = Array.isArray(response) ? response : response?.content;
  return {
    stopReason: Array.isArray(response) ? undefined : response?.stop_reason,
    contentType: Array.isArray(content) ? "array" : typeof content,
    blocks: Array.isArray(content) ? content.map(item => ({
      type: item?.type,
      name: item?.name,
      inputType: Array.isArray(item?.input) ? "array" : typeof item?.input,
      inputKeys: item?.input && typeof item.input === "object" && !Array.isArray(item.input)
        ? Object.keys(item.input).sort()
        : undefined
    })) : []
  };
}

function summaryFromResponse(response) {
  if (!Array.isArray(response) && response?.stop_reason === "max_tokens") {
    throw invalidSummary("truncated_structured_response");
  }
  const content = Array.isArray(response) ? response : response?.content;
  if (!Array.isArray(content)) throw invalidSummary("missing_tool_use");

  const toolUses = content.filter(item => item?.type === "tool_use");
  if (!toolUses.length) throw invalidSummary("missing_tool_use");
  const expectedToolUses = toolUses.filter(item => item?.name === SUMMARY_TOOL_NAME);
  if (!expectedToolUses.length) throw invalidSummary("wrong_tool_name");
  if (expectedToolUses.length !== 1) throw invalidSummary("duplicate_tool_use");

  const input = expectedToolUses[0].input;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalidSummary("missing_summary");
  if (typeof input.summary !== "string" || !input.summary.trim()) throw invalidSummary("missing_summary");

  const hasCamelCase = Object.hasOwn(input, "keyElements");
  const hasSnakeCase = Object.hasOwn(input, "key_elements");
  if (hasCamelCase && hasSnakeCase) throw invalidSummary("invalid_keyElements");
  const keyElements = hasCamelCase ? input.keyElements : input.key_elements;
  if (!Array.isArray(keyElements) || keyElements.some(item => typeof item !== "string" || !item.trim())) {
    throw invalidSummary("invalid_keyElements");
  }
  if (keyElements.length > 8 || keyElements.some(item => item.trim().length > 240)) {
    throw invalidSummary("invalid_keyElements");
  }

  return { summary: input.summary.trim(), keyElements: keyElements.map(item => item.trim()) };
}

async function summaryWithRetry(request, onRejected = () => {}) {
  for (let index = 0; index < SUMMARY_TOKEN_BUDGETS.length; index += 1) {
    const payload = await request(SUMMARY_TOKEN_BUDGETS[index], index + 1);
    try {
      return summaryFromResponse(payload);
    } catch (error) {
      if (error.code !== "INVALID_SUMMARY_RESPONSE") throw error;
      onRejected({ attempt: index + 1, ...summaryResponseDiagnostics(payload), reason: error.reason });
      if (index === SUMMARY_TOKEN_BUDGETS.length - 1) throw error;
    }
  }
}

module.exports = {
  SUMMARY_TOOL_NAME,
  SUMMARY_TOOL,
  SUMMARY_TOKEN_BUDGETS,
  summaryRequestOptions,
  summaryFromResponse,
  summaryResponseDiagnostics,
  summaryWithRetry
};
