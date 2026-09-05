const { getPrivilegedSupabase } = require("./privilegedSupabase");

const AI_MODEL = "claude-sonnet-4-6";
const AI_FEATURES = Object.freeze({
  CHAT: "chat",
  MEMORY: "memory",
  BLUEPRINT_INTERPRETATION: "blueprint_interpretation",
  BLUEPRINT_SUMMARY: "blueprint_summary",
  CREATOR_DNA: "creator_dna"
});

async function recordAnthropicUsage({ userId, feature, response, client }) {
  const inputTokens = response?.usage?.input_tokens;
  const outputTokens = response?.usage?.output_tokens;
  if (!userId || !Object.values(AI_FEATURES).includes(feature)
      || !Number.isSafeInteger(inputTokens) || inputTokens < 0
      || !Number.isSafeInteger(outputTokens) || outputTokens < 0) {
    console.error("Anthropic usage telemetry was not recorded: invalid metadata", {
      feature,
      hasUserId: Boolean(userId),
      hasRequestId: Boolean(response?.id)
    });
    return false;
  }

  try {
    const supabase = client || getPrivilegedSupabase();
    const result = await supabase.from("ai_usage_events").insert({
      user_id: userId,
      feature,
      model: response.model || AI_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      provider_request_id: response.id || null
    });
    if (result.error) throw result.error;
    return true;
  } catch (error) {
    // Claude has already returned successfully. Observability must never change
    // the user-facing outcome of that request.
    console.error("Anthropic usage telemetry persistence failed", {
      feature,
      hasRequestId: Boolean(response?.id),
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

module.exports = { AI_FEATURES, AI_MODEL, recordAnthropicUsage };
