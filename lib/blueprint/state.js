const BLUEPRINT_STATUS = Object.freeze({ NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat" });
const SECTION_STATUS = Object.freeze({ NOT_STARTED: "inceput", IN_PROGRESS: "in_desfasurare", COMPLETED: "confirmat", REVIEW: "de_revizuit" });

function blueprintState(blueprint, sections = [], answers = []) {
  const currentAtelier = Math.min(Math.max(blueprint?.current_atelier || 1, 1), 8);
  const section = sections.find(item => item.atelier_number === currentAtelier);
  const atelierAnswers = answers.filter(item => item.atelier_number === currentAtelier);
  const answeredQuestions = new Set(atelierAnswers.filter(item => item.raw_answer).map(item => item.question_number));
  let currentQuestion = 1;
  while (answeredQuestions.has(currentQuestion)) currentQuestion += 1;
  return {
    started: blueprint?.status === BLUEPRINT_STATUS.IN_PROGRESS || blueprint?.status === BLUEPRINT_STATUS.COMPLETED,
    blueprintCompleted: blueprint?.status === BLUEPRINT_STATUS.COMPLETED,
    currentAtelier,
    currentQuestion,
    answers: atelierAnswers.map(item => ({ questionNumber: item.question_number, rawAnswer: item.raw_answer || "", interpretation: item.interpreted_answer || "" })),
    summary: section?.interpreted_summary || "",
    keyElements: section?.key_elements || [],
    sectionStatus: section?.status || SECTION_STATUS.NOT_STARTED,
    completed: section?.status === SECTION_STATUS.COMPLETED
  };
}

module.exports = { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState };
