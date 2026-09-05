const CHAT_CONTEXT_MESSAGES = 39;

async function loadConversation(client, userId) {
  const result = await client
    .from("ewa_conversations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

async function loadChatHistory(client, userId) {
  const conversation = await loadConversation(client, userId);
  if (!conversation) return [];
  const result = await client
    .from("ewa_messages")
    .select("role,content")
    .eq("user_id", userId)
    .eq("conversation_id", conversation.id)
    .order("ordinal", { ascending: true });
  if (result.error) throw result.error;
  return result.data || [];
}

async function loadChatContext(client, userId) {
  const conversation = await loadConversation(client, userId);
  if (!conversation) return [];
  const result = await client
    .from("ewa_messages")
    .select("role,content")
    .eq("user_id", userId)
    .eq("conversation_id", conversation.id)
    .order("ordinal", { ascending: false })
    .limit(CHAT_CONTEXT_MESSAGES);
  if (result.error) throw result.error;
  return (result.data || []).reverse();
}

async function claimChatRequest(client, requestId, userMessage) {
  const result = await client.rpc("claim_ewa_chat_request", {
    p_request_id: requestId,
    p_user_message: userMessage
  });
  if (result.error) throw result.error;
  return result.data;
}

async function completeChatRequest(client, requestId, userMessage, assistantMessage) {
  const result = await client.rpc("complete_ewa_chat_request", {
    p_request_id: requestId,
    p_user_message: userMessage,
    p_assistant_message: assistantMessage
  });
  if (result.error) throw result.error;
  return result.data;
}

module.exports = {
  CHAT_CONTEXT_MESSAGES,
  claimChatRequest,
  completeChatRequest,
  loadChatContext,
  loadChatHistory
};
