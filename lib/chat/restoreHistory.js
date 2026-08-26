async function restoreChatHistory({ accessToken, fetchImpl }) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  let accessResponse;
  let access;
  try {
    accessResponse = await fetchImpl("/api/access-status", { headers });
    access = await accessResponse.json();
  } catch (error) {
    error.stage = "access";
    throw error;
  }

  if (!accessResponse.ok) {
    const error = new Error(access.error || "Access request failed");
    error.stage = "access";
    throw error;
  }

  if (!access.entitled) {
    return { access, messages: null };
  }

  let historyResponse;
  let history;
  try {
    historyResponse = await fetchImpl("/api/chat", { headers });
    history = await historyResponse.json();
  } catch (error) {
    error.stage = "history";
    throw error;
  }
  if (!historyResponse.ok) {
    const error = new Error(history.error || "History request failed");
    error.stage = "history";
    throw error;
  }

  return { access, messages: history.messages };
}

module.exports = restoreChatHistory;
