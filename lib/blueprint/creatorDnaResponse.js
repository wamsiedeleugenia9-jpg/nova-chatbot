const CREATOR_DNA_TOOL_NAME = "return_creator_dna";
const CREATOR_DNA_KEYS = Object.freeze([
  "creator_identity",
  "audience",
  "transformation",
  "offer",
  "voice",
  "content_system",
  "business_goal"
]);
const CREATOR_DNA_KEY_ALIASES = Object.freeze({
  creatorIdentity: "creator_identity",
  contentSystem: "content_system",
  businessGoal: "business_goal"
});

const CREATOR_DNA_TOOL = Object.freeze({
  name: CREATOR_DNA_TOOL_NAME,
  description: "Returnează primele șapte secțiuni ale documentului Creator DNA.",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(CREATOR_DNA_KEYS.map(key => [key, { type: "string", description: "Secțiune Creator DNA în limba română." }])),
    required: [...CREATOR_DNA_KEYS],
    additionalProperties: false
  }
});

function creatorDnaRequestOptions() {
  return { tools: [CREATOR_DNA_TOOL], tool_choice: { type: "tool", name: CREATOR_DNA_TOOL_NAME } };
}

function invalidCreatorDna(reason) {
  const error = new Error("Anthropic returned an invalid structured Creator DNA");
  error.code = "INVALID_CREATOR_DNA_RESPONSE";
  error.reason = reason;
  return error;
}

function creatorDnaResponseDiagnostics(response) {
  const content = Array.isArray(response) ? response : response?.content;
  return {
    stopReason: Array.isArray(response) ? undefined : response?.stop_reason,
    contentType: Array.isArray(content) ? "array" : typeof content,
    blocks: Array.isArray(content) ? content.map(item => ({
      type: item?.type,
      name: item?.name,
      inputType: Array.isArray(item?.input) ? "array" : typeof item?.input,
      inputKeys: item?.input && typeof item.input === "object" && !Array.isArray(item.input) ? Object.keys(item.input).sort() : undefined
    })) : []
  };
}

function creatorDnaFromResponse(response) {
  const content = Array.isArray(response) ? response : response?.content;
  if (!Array.isArray(content)) throw invalidCreatorDna("missing_content_array");
  const toolUses = content.filter(item => item?.type === "tool_use" && item?.name === CREATOR_DNA_TOOL_NAME);
  if (toolUses.length !== 1) throw invalidCreatorDna(toolUses.length ? "duplicate_tool_output" : "missing_tool_output");
  const input = toolUses[0].input;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalidCreatorDna("invalid_tool_input");

  const normalized = {};
  for (const [responseKey, value] of Object.entries(input)) {
    const key = CREATOR_DNA_KEY_ALIASES[responseKey] || responseKey;
    if (!CREATOR_DNA_KEYS.includes(key) || Object.hasOwn(normalized, key)) throw invalidCreatorDna("unexpected_or_duplicate_key");
    normalized[key] = value;
  }
  if (CREATOR_DNA_KEYS.some(key => typeof normalized[key] !== "string" || !normalized[key].trim())) {
    throw invalidCreatorDna("missing_or_empty_section");
  }
  return Object.fromEntries(CREATOR_DNA_KEYS.map(key => [key, normalized[key].trim()]));
}

function appendWhy(sections, rawAnswer) {
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) throw new Error("Workshop 8 raw answer is missing");
  return { ...sections, why: rawAnswer };
}

module.exports = { CREATOR_DNA_KEYS, CREATOR_DNA_TOOL, CREATOR_DNA_TOOL_NAME, appendWhy, creatorDnaFromResponse, creatorDnaRequestOptions, creatorDnaResponseDiagnostics };
