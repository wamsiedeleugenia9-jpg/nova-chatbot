const CHAT_LENGTH_LIMIT_NOTICE = "[Raspunsul a atins limita de lungime. Cere-mi sa continui.]";

function formatMainChatResponse(response) {
  const partialText = response?.content?.[0]?.text || "";
  const isTruncated = response?.stop_reason === "max_tokens";

  if (isTruncated) {
    return {
      isTruncated,
      reply: partialText
        ? `${partialText}\n\n${CHAT_LENGTH_LIMIT_NOTICE}`
        : CHAT_LENGTH_LIMIT_NOTICE
    };
  }

  return {
    isTruncated,
    reply: partialText || "Nu am putut genera un raspuns. Incearca din nou."
  };
}

module.exports = { CHAT_LENGTH_LIMIT_NOTICE, formatMainChatResponse };
