const BLUEPRINT_STATUS = Object.freeze({ NOT_STARTED: "not_started", IN_PROGRESS: "in_progress" });
const SECTION_STATUS = Object.freeze({ NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", COMPLETED: "completed" });

function blueprintState(blueprint, section, answer) {
  return {
    started: blueprint?.status === BLUEPRINT_STATUS.IN_PROGRESS,
    rawAnswer: answer?.raw_answer || "",
    interpretation: answer?.interpreted_answer || "",
    adjustmentRequest: answer?.adjustment_request || "",
    completed: section?.status === SECTION_STATUS.COMPLETED && Boolean(section?.confirmed_at)
  };
}

module.exports = { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState };
