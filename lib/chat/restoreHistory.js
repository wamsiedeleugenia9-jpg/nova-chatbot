async function restoreChatHistory({ accessToken, fetchImpl }) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const accessResponse = await fetchImpl("/api/access-status", { headers });
  const access = await accessResponse.json();

  if (!accessResponse.ok) {
    throw new Error(access.error || "Access request failed");
  }

  if (!access.entitled) {
    return { access, messages: null };
  }

  const historyResponse = await fetchImpl("/api/chat", { headers });
  const history = await historyResponse.json();
  if (!historyResponse.ok) {
    throw new Error(history.error || "History request failed");
  }

  return { access, messages: history.messages };
}

module.exports = restoreChatHistory;
