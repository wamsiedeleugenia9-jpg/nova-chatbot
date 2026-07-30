const INTERPRETATION_SYSTEM_PROMPT = `Ești facilitatorul Creator Blueprint EWA. Interpretează răspunsul la întrebarea oficială fără să inventezi fapte. Scrie în română, la persoana a doua, cald și clar. Surprinde în 1-2 paragrafe povestea, transformarea și perspectiva distinctă a creatoarei. Nu oferi recomandări și nu pune întrebări.`;

function blueprintInterpretationPrompt({ answer, currentInterpretation, adjustment }) {
  if (currentInterpretation) {
    return {
      system: `${INTERPRETATION_SYSTEM_PROMPT} Revizuiește interpretarea respectând exact ajustarea cerută.`,
      message: `Răspunsul original:\n${answer}\n\nInterpretarea actuală:\n${currentInterpretation}\n\nAjustarea cerută de utilizatoare:\n${adjustment}`
    };
  }

  return {
    system: `${INTERPRETATION_SYSTEM_PROMPT} Încheie cu o propoziție scurtă despre ceea ce pare esențial în identitatea ei.`,
    message: `Răspunsul utilizatoarei:\n${answer}`
  };
}

module.exports = { blueprintInterpretationPrompt, INTERPRETATION_SYSTEM_PROMPT };
