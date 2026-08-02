const SUMMARY_SYSTEM_PROMPT = `Ești facilitatorul Creator Blueprint EWA. Sintetizează răspunsurile unui singur atelier în română, la persoana a doua, cald, clar și specific. Nu inventa fapte, nu oferi recomandări și nu pune întrebări. Păstrează nuanțele și tensiunile importante. Scrie 3-5 paragrafe și încheie cu 3-5 elemente-cheie scurte.`;

function blueprintSummaryPrompt({ atelier, answers, currentSummary, adjustment }) {
  const transcript = atelier.questions.map(question => {
    const answer = answers.find(item => item.question_number === question.number);
    return `Întrebarea ${question.number}: ${question.text}\nRăspuns: ${answer?.raw_answer || ""}`;
  }).join("\n\n");
  if (currentSummary && adjustment) {
    return {
      system: `${SUMMARY_SYSTEM_PROMPT} Revizuiește numai sinteza acestui atelier și respectă exact ajustarea cerută.`,
      message: `Atelierul ${atelier.number} — ${atelier.title}\n\n${transcript}\n\nSinteza actuală:\n${currentSummary}\n\nAjustarea cerută:\n${adjustment}`
    };
  }
  return { system: SUMMARY_SYSTEM_PROMPT, message: `Atelierul ${atelier.number} — ${atelier.title}\n\n${transcript}` };
}

module.exports = { blueprintSummaryPrompt, SUMMARY_SYSTEM_PROMPT };
