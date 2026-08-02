const BLUEPRINT_STATUS = Object.freeze({ NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat" });
const SECTION_STATUS = Object.freeze({ NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat", REVIEW: "de_revazut" });

function blueprintState(blueprint, sections = [], answers = []) {
  const currentAtelier = Math.min(Math.max(blueprint?.current_atelier || 1, 1), 7);
  const section = sections.find(item => item.atelier_number === currentAtelier);
  const atelierAnswers = answers.filter(item => item.atelier_number === currentAtelier);
  const firstMissing = atelierAnswers.findIndex(item => !item.raw_answer);
  const answered = atelierAnswers.filter(item => item.raw_answer).length;
  return {
    started: blueprint?.status === BLUEPRINT_STATUS.IN_PROGRESS,
    currentAtelier,
    currentQuestion: firstMissing >= 0 ? firstMissing + 1 : answered + 1,
    answers: atelierAnswers.map(item => ({ questionNumber: item.question_number, rawAnswer: item.raw_answer || "", interpretation: item.interpreted_answer || "" })),
    summary: section?.interpreted_summary || "",
    keyElements: section?.key_elements || [],
    sectionStatus: section?.status || SECTION_STATUS.NOT_STARTED,
    completed: section?.status === SECTION_STATUS.COMPLETED,
    paused: Boolean(blueprint?.paused_at)
  };
}

module.exports = { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState };
