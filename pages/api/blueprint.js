const BLUEPRINT_CONTENT = require("../../content/creator-blueprint.json");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState, firstUnansweredQuestion } = require("../../lib/blueprint/state");
const { blueprintSummaryPrompt } = require("../../lib/prompts/creatorBlueprint");
const { authenticatedClient } = require("../../lib/server/supabase");

const MAX_ANSWER_LENGTH = 8000;
const MAX_ADJUSTMENT_LENGTH = 2000;
const ATELIERS = [...BLUEPRINT_CONTENT.ateliers].sort((a, b) => a.number - b.number);

function atelierByNumber(number) {
  return ATELIERS.find(atelier => atelier.number === Number(number));
}

async function generateSummary(values) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic server configuration is missing");
  const prompt = blueprintSummaryPrompt(values);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 1200, system: prompt.system,
      messages: [{ role: "user", content: prompt.message }]
    })
  });
  if (!response.ok) {
    console.error("Blueprint Anthropic error:", response.status, await response.text());
    throw new Error("Anthropic request failed");
  }
  const data = await response.json();
  const summary = data.content?.find(item => item.type === "text")?.text?.trim();
  if (!summary) throw new Error("Anthropic returned an empty summary");
  return summary;
}

async function loadRecords(client, userId) {
  const [blueprintResult, sectionResult, answerResult] = await Promise.all([
    client.from("creator_blueprints").select("id,current_atelier,status,completed_at").eq("user_id", userId).maybeSingle(),
    client.from("blueprint_sections").select("id,atelier_number,interpreted_summary,key_elements,status,confirmed_at").eq("user_id", userId),
    client.from("blueprint_answers").select("id,atelier_number,question_number,raw_answer").eq("user_id", userId)
  ]);
  const error = blueprintResult.error || sectionResult.error || answerResult.error;
  if (error) throw error;
  return { blueprint: blueprintResult.data, sections: sectionResult.data || [], answers: answerResult.data || [] };
}

async function ensureBlueprint(client, userId, records) {
  if (!records.blueprint) {
    const result = await client.from("creator_blueprints").upsert({
      user_id: userId, current_atelier: ATELIERS[0].number,
      status: BLUEPRINT_STATUS.NOT_STARTED, updated_at: new Date().toISOString()
    }, { onConflict: "user_id", ignoreDuplicates: true });
    if (result.error) throw result.error;
    return loadRecords(client, userId);
  }
  return records;
}

async function ensureSection(client, userId, atelierNumber) {
  const result = await client.from("blueprint_sections").upsert({
    user_id: userId, atelier_number: atelierNumber, status: SECTION_STATUS.NOT_STARTED,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,atelier_number", ignoreDuplicates: true });
  if (result.error) throw result.error;
}

async function updateBlueprint(client, userId, values) {
  const result = await client.from("creator_blueprints").update({ ...values, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (result.error) throw result.error;
}

async function updateSection(client, userId, atelierNumber, values) {
  const result = await client.from("blueprint_sections").update({ ...values, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("atelier_number", atelierNumber);
  if (result.error) throw result.error;
}

function expectedStep(records) {
  const start = atelierByNumber(records.blueprint?.current_atelier) || ATELIERS[0];
  const candidates = [...ATELIERS.filter(item => item.number >= start.number), ...ATELIERS.filter(item => item.number < start.number)];
  for (const atelier of candidates) {
    const section = records.sections.find(item => item.atelier_number === atelier.number);
    if (section?.status === SECTION_STATUS.COMPLETED) continue;
    return { atelier, section, question: firstUnansweredQuestion(atelier, records.answers) };
  }
  return null;
}

function responseBody(records) {
  return { content: BLUEPRINT_CONTENT, state: blueprintState(BLUEPRINT_CONTENT, records.blueprint, records.sections, records.answers) };
}

async function saveMissingSummary(client, userId, records, step) {
  if (step.question) return { error: "Răspunde la toate întrebările înainte de generarea sintezei.", status: 409 };
  if (step.section?.interpreted_summary) return { error: "Sinteza atelierului există deja.", status: 409 };
  const answers = records.answers.filter(answer => answer.atelier_number === step.atelier.number);
  const summary = await generateSummary({ atelier: step.atelier, answers });
  await updateSection(client, userId, step.atelier.number, {
    interpreted_summary: summary, status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null
  });
  return null;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metoda nu este permisă." });
  }
  let auth;
  try { auth = await authenticatedClient(req); }
  catch (error) {
    console.error("Blueprint auth configuration error:", error);
    return res.status(500).json({ error: "Serviciul nu este configurat." });
  }
  if (!auth) return res.status(401).json({ error: "Autentificare necesară." });

  const { client, user } = auth;
  try {
    let records = await ensureBlueprint(client, user.id, await loadRecords(client, user.id));
    if (req.method === "GET") return res.status(200).json(responseBody(records));

    const action = req.body?.action;
    if (action === "start") {
      const step = expectedStep(records);
      if (!step) return res.status(409).json({ error: "Blueprint-ul este deja finalizat." });
      await ensureSection(client, user.id, step.atelier.number);
      await updateBlueprint(client, user.id, { current_atelier: step.atelier.number, status: BLUEPRINT_STATUS.IN_PROGRESS, completed_at: null });
      await updateSection(client, user.id, step.atelier.number, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
    } else if (action === "submit") {
      const step = expectedStep(records);
      const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
      if (!step?.question) return res.status(409).json({ error: "Nu există o întrebare disponibilă pentru răspuns." });
      if (Number(req.body?.atelierNumber) !== step.atelier.number || Number(req.body?.questionNumber) !== step.question.number) {
        return res.status(409).json({ error: "Întrebările trebuie completate în ordine." });
      }
      if (!answer || answer.length > MAX_ANSWER_LENGTH) return res.status(400).json({ error: `Răspunsul trebuie să aibă între 1 și ${MAX_ANSWER_LENGTH} de caractere.` });
      await ensureSection(client, user.id, step.atelier.number);
      const insert = await client.from("blueprint_answers").insert({
        user_id: user.id, atelier_number: step.atelier.number, question_number: step.question.number, raw_answer: answer
      });
      if (insert.error) throw insert.error;
      await updateBlueprint(client, user.id, { current_atelier: step.atelier.number, status: BLUEPRINT_STATUS.IN_PROGRESS, completed_at: null });
      await updateSection(client, user.id, step.atelier.number, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
      records = await loadRecords(client, user.id);
      const afterSubmit = expectedStep(records);
      if (afterSubmit?.atelier.number === step.atelier.number && !afterSubmit.question && !afterSubmit.section?.interpreted_summary) {
        await saveMissingSummary(client, user.id, records, afterSubmit);
      }
    } else if (action === "generate_summary") {
      const step = expectedStep(records);
      if (!step || Number(req.body?.atelierNumber) !== step.atelier.number) return res.status(409).json({ error: "Atelierul cerut nu este atelierul curent." });
      const problem = await saveMissingSummary(client, user.id, records, step);
      if (problem) return res.status(problem.status).json({ error: problem.error });
    } else if (action === "adjust") {
      const step = expectedStep(records);
      const adjustment = typeof req.body?.adjustment === "string" ? req.body.adjustment.trim() : "";
      if (!step || Number(req.body?.atelierNumber) !== step.atelier.number) return res.status(409).json({ error: "Poți ajusta numai atelierul curent." });
      if (!step.section?.interpreted_summary) return res.status(409).json({ error: "Nu există o sinteză de ajustat." });
      if (!adjustment || adjustment.length > MAX_ADJUSTMENT_LENGTH) return res.status(400).json({ error: `Ajustarea trebuie să aibă între 1 și ${MAX_ADJUSTMENT_LENGTH} de caractere.` });
      const answers = records.answers.filter(answer => answer.atelier_number === step.atelier.number);
      const summary = await generateSummary({ atelier: step.atelier, answers, currentSummary: step.section.interpreted_summary, adjustment });
      await updateSection(client, user.id, step.atelier.number, { interpreted_summary: summary, status: SECTION_STATUS.NEEDS_REVIEW, confirmed_at: null });
      await updateBlueprint(client, user.id, { current_atelier: step.atelier.number, status: BLUEPRINT_STATUS.IN_PROGRESS, completed_at: null });
    } else if (action === "confirm") {
      const step = expectedStep(records);
      if (!step || Number(req.body?.atelierNumber) !== step.atelier.number) return res.status(409).json({ error: "Poți confirma numai atelierul curent." });
      if (step.question || !step.section?.interpreted_summary) return res.status(409).json({ error: "Atelierul are nevoie de toate răspunsurile și de o sinteză înainte de confirmare." });
      const now = new Date().toISOString();
      await updateSection(client, user.id, step.atelier.number, { status: SECTION_STATUS.COMPLETED, confirmed_at: now });
      const next = ATELIERS.find(item => item.number > step.atelier.number);
      if (next) {
        await ensureSection(client, user.id, next.number);
        await updateBlueprint(client, user.id, { current_atelier: next.number, status: BLUEPRINT_STATUS.IN_PROGRESS, completed_at: null });
      } else {
        await updateBlueprint(client, user.id, { current_atelier: step.atelier.number, status: BLUEPRINT_STATUS.COMPLETED, completed_at: now });
      }
    } else {
      return res.status(400).json({ error: "Acțiune necunoscută." });
    }
    records = await loadRecords(client, user.id);
    return res.status(200).json(responseBody(records));
  } catch (error) {
    console.error("Blueprint API error:", error);
    return res.status(500).json({ error: "Nu am putut salva progresul. Încearcă din nou." });
  }
}

export { ATELIERS, MAX_ADJUSTMENT_LENGTH, MAX_ANSWER_LENGTH, expectedStep };
