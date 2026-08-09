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

function creatorDnaFromResponse(content) {
  const input = content?.find(item => item.type === "tool_use" && item.name === CREATOR_DNA_TOOL_NAME)?.input;
  if (!input || CREATOR_DNA_KEYS.some(key => typeof input[key] !== "string" || !input[key].trim())) {
    throw new Error("Anthropic returned an invalid structured Creator DNA");
  }
  return Object.fromEntries(CREATOR_DNA_KEYS.map(key => [key, input[key].trim()]));
}

function appendWhy(sections, rawAnswer) {
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) throw new Error("Workshop 8 raw answer is missing");
  return { ...sections, why: rawAnswer };
}

module.exports = { CREATOR_DNA_KEYS, CREATOR_DNA_TOOL, CREATOR_DNA_TOOL_NAME, appendWhy, creatorDnaFromResponse, creatorDnaRequestOptions };
