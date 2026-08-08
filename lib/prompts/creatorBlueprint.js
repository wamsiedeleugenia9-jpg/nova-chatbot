const TONE = "Scrie în română, clar, cald, respectuos și conversațional, fără jargon, presiune sau ton de consultant rece. Nu inventa fapte.";

function answerInterpretationPrompt({ question, answer }) {
  return { system: `Ești facilitatorul Creator Blueprint EWA. ${TONE}`, message: `Întrebarea:\n${question}\n\nRăspunsul exact al utilizatoarei:\n${answer}\n\nRedă într-o singură propoziție înțelegerea temporară a răspunsului. Nu pune întrebări.` };
}

function sectionSummaryPrompt({ atelier, answers, currentSummary, adjustment }) {
  const revision = currentSummary ? `\n\nRezumat actual:\n${currentSummary}\n\nAjustare cerută: ${adjustment}\nRegenerează exclusiv rezumatul acestui atelier.` : "";
  return {
    system: `Ești facilitatorul Creator Blueprint EWA. ${TONE} ${atelier.summaryInstruction} Returnează strict JSON valid cu forma {"summary":"...","keyElements":["..."]}.`,
    message: `Atelierul ${atelier.number} — ${atelier.title}\n${answers.map(item => `Î${item.questionNumber}: ${item.rawAnswer}`).join("\n")} ${revision}`
  };
}

module.exports = { answerInterpretationPrompt, sectionSummaryPrompt, TONE };
