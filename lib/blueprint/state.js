const BLUEPRINT_STATUS = Object.freeze({
  NOT_STARTED: "inceput",
  IN_PROGRESS: "in_desfasurare",
  COMPLETED: "confirmat",
  NEEDS_REVIEW: "de_revizuit"
});
const SECTION_STATUS = BLUEPRINT_STATUS;

function sortedQuestions(atelier) {
  return [...atelier.questions].sort((a, b) => a.number - b.number);
}

function firstUnansweredQuestion(atelier, answers = []) {
  const answeredNumbers = new Set(
    answers.filter(answer => answer.atelier_number === atelier.number && answer.raw_answer?.trim())
      .map(answer => answer.question_number)
  );
  return sortedQuestions(atelier).find(question => !answeredNumbers.has(question.number)) || null;
}

function blueprintState(content, blueprint, sections = [], answers = []) {
  const ateliers = [...content.ateliers].sort((a, b) => a.number - b.number);
  const sectionByAtelier = new Map(sections.map(section => [section.atelier_number, section]));
  let atelier = ateliers.find(item => item.number === blueprint?.current_atelier) || ateliers[0];
  if (sectionByAtelier.get(atelier.number)?.status === SECTION_STATUS.COMPLETED) {
    atelier = ateliers.find(item => sectionByAtelier.get(item.number)?.status !== SECTION_STATUS.COMPLETED) || atelier;
  }
  const section = sectionByAtelier.get(atelier.number) || null;
  const question = firstUnansweredQuestion(atelier, answers);
  return {
    started: blueprint?.status !== BLUEPRINT_STATUS.NOT_STARTED,
    completed: blueprint?.status === BLUEPRINT_STATUS.COMPLETED,
    currentAtelier: atelier.number,
    currentQuestion: question?.number || null,
    answers: answers.filter(answer => answer.atelier_number === atelier.number).map(answer => ({
      questionNumber: answer.question_number,
      rawAnswer: answer.raw_answer
    })),
    summary: section?.interpreted_summary || "",
    sectionStatus: section?.status || SECTION_STATUS.NOT_STARTED,
    confirmedAt: section?.confirmed_at || null,
    needsSummary: !question && !section?.interpreted_summary
  };
}

module.exports = { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState, firstUnansweredQuestion, sortedQuestions };
