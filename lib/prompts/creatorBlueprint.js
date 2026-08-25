const TONE = "Scrie în română, clar, cald, respectuos și conversațional, fără jargon, presiune sau ton de consultant rece. Nu inventa fapte.";
const SUMMARY_DISCIPLINE = `Păstrează o distincție clară între ce a confirmat utilizatoarea și ce propune EWA:
- Ancorează afirmațiile despre utilizatoare, public, ofertă și rezultate în răspunsurile ei; o preferință nu este dovadă de performanță, iar un preț ales nu este validare de piață.
- Nu prezenta drept fapte evaluări nesusținute precum „cel mai bun”, „cel mai puternic”, „ideal”, „corect”, „validat”, „accesibil”, „competitiv” sau echivalente.
- Poți sintetiza și deduce legături prudente din răspunsuri, dar marchează explicit orice plan, ritm sau soluție adăugată de EWA drept recomandare/propunere, nu alegere confirmată.
- Când utilizatoarea numește o teamă, îndoială, credință sau un tipar, păstrează formularea ei și leagă-l doar de comportamente observabile susținute de răspunsuri. Nu diagnostica, nu reformula motivațional, nu îi spune ce ar trebui să creadă despre sine și nu transforma reacții externe, vânzări sau engagement în dovezi ale valorii, pregătirii ori competenței ei.`;

function answerInterpretationPrompt({ question, answer }) {
  return { system: `Ești facilitatorul Creator Blueprint EWA. ${TONE}`, message: `Întrebarea:\n${question}\n\nRăspunsul exact al utilizatoarei:\n${answer}\n\nRedă într-o singură propoziție înțelegerea temporară a răspunsului. Nu pune întrebări.` };
}

function sectionSummaryPrompt({ atelier, answers, currentSummary, adjustment }) {
  const revision = currentSummary ? `\n\nRezumat actual:\n${currentSummary}\n\nAjustare cerută: ${adjustment}\nRegenerează exclusiv rezumatul acestui atelier.` : "";
  return {
    system: `Ești facilitatorul Creator Blueprint EWA. ${TONE} ${SUMMARY_DISCIPLINE} ${atelier.summaryInstruction} Returnează rezultatul exclusiv prin instrumentul structurat pus la dispoziție, completând câmpurile summary și keyElements.`,
    message: `Atelierul ${atelier.number} — ${atelier.title}\n${answers.map(item => `Î${item.questionNumber}: ${item.rawAnswer}`).join("\n")} ${revision}`
  };
}

function creatorDnaPrompt({ sections, answers }) {
  const material = sections.map(section => {
    const raw = answers.filter(answer => answer.atelier_number === section.atelier_number)
      .map(answer => `Î${answer.question_number}: ${answer.raw_answer}`).join("\n");
    return `Atelierul ${section.atelier_number}\nRezumat confirmat: ${section.interpreted_summary}\nElemente-cheie: ${JSON.stringify(section.key_elements || [])}\nRăspunsuri originale:\n${raw}`;
  }).join("\n\n");
  return {
    system: `Ești facilitatorul Creator Blueprint EWA. ${TONE} ${SUMMARY_DISCIPLINE} Sintetizează exclusiv primele șapte secțiuni Creator DNA din materialul confirmat. Nu crea și nu returna secțiunea «De ce faci asta» și nu adăuga alte chei.`,
    message: `Construiește secțiunile 1–7 ale Creator DNA. Rezumatele confirmate sunt sursa principală; răspunsurile și elementele-cheie sunt doar material de ancorare.\n\n${material}`
  };
}

module.exports = { answerInterpretationPrompt, creatorDnaPrompt, sectionSummaryPrompt, SUMMARY_DISCIPLINE, TONE };
