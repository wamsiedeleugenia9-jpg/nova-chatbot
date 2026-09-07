const AI_RATE_LIMITED = "AI_RATE_LIMITED";
const AI_ADMISSION_UNAVAILABLE = "AI_ADMISSION_UNAVAILABLE";

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function admitAiCall(client) {
  let result;
  try {
    result = await client.rpc("admit_ai_call");
  } catch (error) {
    return { status: "unavailable", error };
  }
  if (result.error) return { status: "unavailable", error: result.error };

  const retryAfterSeconds = positiveInteger(result.data?.retry_after_seconds);
  if (result.data?.allowed === true) {
    return { status: "allowed", remaining: Math.max(0, Number(result.data.remaining) || 0) };
  }
  if (result.data?.allowed === false && retryAfterSeconds) {
    return { status: "rate_limited", retryAfterSeconds };
  }
  return { status: "unavailable", error: new Error("Invalid AI admission response") };
}

async function requireAiCallPermit(client) {
  const admission = await admitAiCall(client);
  if (admission.status === "allowed") return admission;
  const error = new Error(admission.status === "rate_limited" ? "AI rate limit exceeded" : "AI admission unavailable");
  error.code = admission.status === "rate_limited" ? AI_RATE_LIMITED : AI_ADMISSION_UNAVAILABLE;
  if (admission.retryAfterSeconds) error.retryAfterSeconds = admission.retryAfterSeconds;
  if (admission.error) error.cause = admission.error;
  throw error;
}

function sendAiAdmissionError(res, error) {
  res.setHeader("Cache-Control", "private, no-store");
  if (error?.code === AI_RATE_LIMITED) {
    const retryAfterSeconds = positiveInteger(error.retryAfterSeconds) || 1;
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: "ai_rate_limit_exceeded",
      message: "Prea multe solicitări AI. Încearcă din nou în câteva momente.",
      retryAfterSeconds
    });
  }
  return res.status(503).json({
    error: "ai_admission_unavailable",
    message: "Serviciul AI este temporar indisponibil. Încearcă din nou."
  });
}

module.exports = {
  AI_ADMISSION_UNAVAILABLE,
  AI_RATE_LIMITED,
  admitAiCall,
  requireAiCallPermit,
  sendAiAdmissionError
};
