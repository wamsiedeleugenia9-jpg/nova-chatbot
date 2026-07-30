const BLUEPRINT_STATUS = Object.freeze({ NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare" });
const SECTION_STATUS = Object.freeze({ NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat" });

function blueprintState(blueprint, section, answer) {
  return {
    started: blueprint?.status === BLUEPRINT_STATUS.IN_PROGRESS,
    rawAnswer: answer?.raw_answer || "",
    interpretation: answer?.interpreted_answer || "",
    adjustmentRequest: answer?.adjustment_request || "",
    completed: section?.status === SECTION_STATUS.COMPLETED && Boolean(section?.confirmed_at)
  };
}

function blueprintLoadPhase(session, content, error) {
  if (session === undefined) return "authenticating";
  if (!session) return "unauthenticated";
  if (content) return "ready";
  if (error) return "error";
  return "loading";
}

module.exports = { BLUEPRINT_STATUS, SECTION_STATUS, blueprintLoadPhase, blueprintState };
