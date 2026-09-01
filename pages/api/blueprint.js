const CONTENT = require("../../content/creator-blueprint.json");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState, changedWorkshopAnswers, normalizeWorkshopAnswers } = require("../../lib/blueprint/state");
const { answerInterpretationPrompt, creatorDnaPrompt, sectionSummaryPrompt } = require("../../lib/prompts/creatorBlueprint");
const { summaryRequestOptions, summaryWithRetry } = require("../../lib/blueprint/summaryResponse");
const { appendWhy, creatorDnaFromResponse, creatorDnaRequestOptions, creatorDnaResponseDiagnostics } = require("../../lib/blueprint/creatorDnaResponse");
const { authenticatedClient } = require("../../lib/server/supabase");
const { authorizeFounder } = require("../../lib/server/founderAccess");

const MAX_ANSWER_LENGTH = 8000;
const MAX_ADJUSTMENT_LENGTH = 2000;

function persistenceErrorMessage(method) {
  return method === "GET"
    ? "Nu am putut încărca progresul. Încearcă din nou."
    : "Nu am putut salva progresul. Încearcă din nou.";
}

async function askClaude(prompt, json = false) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic server configuration is missing");
  const request = async maxTokens => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.message }],
        ...(json ? summaryRequestOptions() : {})
      })
    });
    if (!response.ok) { console.error("Blueprint Anthropic error:", response.status, await response.text()); throw new Error("Anthropic request failed"); }
    return response.json();
  };
  if (json) return summaryWithRetry(request, diagnostics => {
    // Structure only: never log the generated summary or workshop answers.
    console.error("Blueprint summary response rejected:", diagnostics);
  });
  const payload = await request(900);
  const text = payload.content?.find(item => item.type === "text")?.text?.trim();
  if (!text) throw new Error("Anthropic returned empty content");
  return text;
}

async function askCreatorDna(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic server configuration is missing");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2400, system: prompt.system, messages: [{ role: "user", content: prompt.message }], ...creatorDnaRequestOptions() })
  });
  if (!response.ok) { console.error("Creator DNA Anthropic error:", response.status, await response.text()); throw new Error("Anthropic request failed"); }
  const payload = await response.json();
  try {
    return creatorDnaFromResponse(payload);
  } catch (error) {
    // Log structure only: Creator DNA text and the user's workshop answers must not
    // be copied into diagnostics.
    console.error("Creator DNA Anthropic response rejected:", creatorDnaResponseDiagnostics(payload), error.reason);
    throw error;
  }
}

async function load(client, userId) {
  const [blueprint, sections, answers, creatorDna] = await Promise.all([
    client.from("creator_blueprints").select("id,current_atelier,status,completed_at").eq("user_id", userId).maybeSingle(),
    client.from("blueprint_sections").select("atelier_number,interpreted_summary,key_elements,status,confirmed_at").eq("user_id", userId).order("atelier_number"),
    client.from("blueprint_answers").select("atelier_number,question_number,raw_answer,interpreted_answer").eq("user_id", userId).order("atelier_number").order("question_number"),
    client.from("creator_dna").select("sections,created_at,updated_at").eq("user_id", userId).maybeSingle()
  ]);
  const error = blueprint.error || sections.error || answers.error || creatorDna.error;
  if (error) throw error;
  return { blueprint: blueprint.data, sections: sections.data || [], answers: answers.data || [], creatorDna: creatorDna.data };
}

async function ensure(client, userId, records) {
  if (!records.blueprint) {
    const result = await client.from("creator_blueprints").upsert({ user_id: userId, current_atelier: 1, status: BLUEPRINT_STATUS.NOT_STARTED, updated_at: new Date().toISOString() }, { onConflict: "user_id", ignoreDuplicates: true });
    if (result.error) throw result.error;
  }
  for (let number = 1; number <= 8; number += 1) {
    if (!records.sections.some(item => item.atelier_number === number)) {
      const result = await client.from("blueprint_sections").upsert({ user_id: userId, atelier_number: number, status: SECTION_STATUS.NOT_STARTED, updated_at: new Date().toISOString() }, { onConflict: "user_id,atelier_number", ignoreDuplicates: true });
      if (result.error) throw result.error;
    }
  }
  return load(client, userId);
}

function responsePayload(records, entitled) {
  return {
    content: CONTENT,
    state: blueprintState(records.blueprint, records.sections, records.answers),
    creatorDna: records.creatorDna?.sections || null,
    entitled,
    hasBlueprint: Boolean(records.blueprint)
  };
}

async function updateBlueprint(client, userId, values) {
  const result = await client.from("creator_blueprints").update({ ...values, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (result.error) throw result.error;
}

async function updateSection(client, userId, atelier, values) {
  const result = await client.from("blueprint_sections").update({ ...values, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("atelier_number", atelier);
  if (result.error) throw result.error;
}

async function regenerateCreatorDna(client, userId, records) {
  const sections = await generateCreatorDna(records);
  const saved = await client.from("creator_dna").upsert({ user_id: userId, sections, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (saved.error) throw saved.error;
}

async function generateCreatorDna(records) {
  const why = records.answers.find(item => item.atelier_number === 8 && item.question_number === 1)?.raw_answer;
  const generated = await askCreatorDna(creatorDnaPrompt({ sections: records.sections.filter(item => item.atelier_number <= 7), answers: records.answers.filter(item => item.atelier_number <= 7) }));
  return appendWhy(generated, why);
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Metoda nu este permisă." }); }
  let auth;
  try { auth = await authenticatedClient(req); } catch (error) { console.error(error); return res.status(500).json({ error: "Serviciul nu este configurat." }); }
  if (!auth) return res.status(401).json({ error: "Autentificare necesară." });
  const { client, user } = auth;
  let authorization;
  try {
    authorization = await authorizeFounder(auth);
  } catch (error) { console.error(error); return res.status(500).json({ error: "Serviciul nu este configurat." }); }
  if (req.method === "POST" && !authorization.allowed) return res.status(403).json({ error: "subscription_required" });
  try {
    let records = await load(client, user.id);
    // GET remains read-only for former Founders. In particular, do not let the
    // initial page load create an empty Blueprint or its section rows.
    if (req.method === "GET") {
      if (authorization.allowed) records = await ensure(client, user.id, records);
      return res.status(200).json(responsePayload(records, authorization.allowed));
    }
    records = await ensure(client, user.id, records);
    const action = req.body?.action;
    const atelierNumber = records.blueprint?.current_atelier || 1;
    const atelier = CONTENT.ateliers[atelierNumber - 1];
    const section = records.sections.find(item => item.atelier_number === atelierNumber);
    const atelierAnswers = records.answers.filter(item => item.atelier_number === atelierNumber);

    if (action === "start") {
      await updateBlueprint(client, user.id, { status: BLUEPRINT_STATUS.IN_PROGRESS, current_atelier: atelierNumber });
      await updateSection(client, user.id, atelierNumber, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
    } else if (action === "edit_workshop") {
      const selected = Number(req.body?.atelierNumber);
      if (records.blueprint?.status !== BLUEPRINT_STATUS.COMPLETED || !Number.isInteger(selected) || selected < 1 || selected > 8) return res.status(409).json({ error: "Atelierul nu poate fi editat." });
      const selectedSection = records.sections.find(item => item.atelier_number === selected);
      if (selectedSection?.status !== SECTION_STATUS.COMPLETED) return res.status(409).json({ error: "Poți edita doar un atelier confirmat." });
      await updateBlueprint(client, user.id, { current_atelier: selected });
      await updateSection(client, user.id, selected, { status: SECTION_STATUS.REVIEW });
    } else if (action === "save_edit") {
      if (records.blueprint?.status !== BLUEPRINT_STATUS.COMPLETED || section?.status !== SECTION_STATUS.REVIEW) return res.status(409).json({ error: "Nu există un atelier deschis pentru editare." });
      const submitted = normalizeWorkshopAnswers(atelier, req.body?.answers);
      if (!submitted) return res.status(400).json({ error: "Completează toate răspunsurile atelierului înainte de rezumat." });
      const changed = changedWorkshopAnswers(atelierAnswers, submitted);
      const preparedAnswers = [];
      for (const item of changed) {
        const interpretation = atelierNumber === 8 ? item.rawAnswer : await askClaude(answerInterpretationPrompt({ question: atelier.questions[item.questionNumber - 1], answer: item.rawAnswer }));
        preparedAnswers.push({ question_number: item.questionNumber, raw_answer: item.rawAnswer, interpreted_answer: interpretation });
      }
      const summary = atelierNumber === 8
        ? { summary: submitted[0].rawAnswer, keyElements: [] }
        : await askClaude(sectionSummaryPrompt({ atelier, answers: submitted }), true);
      const submittedByQuestion = new Map(submitted.map(item => [item.questionNumber, item.rawAnswer]));
      const preparedByQuestion = new Map(preparedAnswers.map(item => [item.question_number, item]));
      const latestRecords = {
        ...records,
        answers: records.answers.map(item => item.atelier_number === atelierNumber && submittedByQuestion.has(item.question_number)
          ? { ...item, raw_answer: submittedByQuestion.get(item.question_number), interpreted_answer: preparedByQuestion.get(item.question_number)?.interpreted_answer || item.interpreted_answer }
          : item),
        sections: records.sections.map(item => item.atelier_number === atelierNumber
          ? { ...item, interpreted_summary: summary.summary, key_elements: summary.keyElements }
          : item)
      };
      const creatorDnaSections = await generateCreatorDna(latestRecords);
      const saved = await client.rpc("save_blueprint_workshop_edit", {
        p_atelier_number: atelierNumber,
        p_answers: preparedAnswers,
        p_interpreted_summary: summary.summary,
        p_key_elements: summary.keyElements,
        p_creator_dna_sections: creatorDnaSections
      });
      if (saved.error) throw saved.error;
    } else if (action === "cancel_edit") {
      if (records.blueprint?.status !== BLUEPRINT_STATUS.COMPLETED || section?.status !== SECTION_STATUS.REVIEW) return res.status(409).json({ error: "Nu există un atelier deschis pentru editare." });
      await updateSection(client, user.id, atelierNumber, { status: SECTION_STATUS.COMPLETED });
    } else if (action === "submit") {
      const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
      const questionNumber = Number(req.body?.questionNumber);
      if (!answer || answer.length > MAX_ANSWER_LENGTH) return res.status(400).json({ error: `Răspunsul trebuie să aibă între 1 și ${MAX_ANSWER_LENGTH} de caractere.` });
      if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > atelier.questions.length) return res.status(400).json({ error: "Întrebare invalidă." });
      const answeredQuestions = new Set(atelierAnswers.filter(item => item.raw_answer).map(item => item.question_number));
      let expectedQuestion = 1;
      while (answeredQuestions.has(expectedQuestion)) expectedQuestion += 1;
      if (questionNumber !== expectedQuestion) return res.status(409).json({ error: "Răspunde la întrebarea curentă înainte să continui." });
      const interpretation = atelierNumber === 8 ? answer : await askClaude(answerInterpretationPrompt({ question: atelier.questions[questionNumber - 1], answer }));
      const saved = await client.from("blueprint_answers").upsert({ user_id: user.id, atelier_number: atelierNumber, question_number: questionNumber, raw_answer: answer, interpreted_answer: interpretation, adjustment_request: null, updated_at: new Date().toISOString() }, { onConflict: "user_id,atelier_number,question_number" });
      if (saved.error) throw saved.error;
      await updateBlueprint(client, user.id, { status: BLUEPRINT_STATUS.IN_PROGRESS });
      await updateSection(client, user.id, atelierNumber, { status: SECTION_STATUS.IN_PROGRESS, interpreted_summary: null, key_elements: null, confirmed_at: null });
      if (questionNumber === atelier.questions.length) {
        const completeAnswers = [...atelierAnswers.filter(item => item.question_number !== questionNumber), { questionNumber, rawAnswer: answer }].map(item => ({ questionNumber: item.questionNumber || item.question_number, rawAnswer: item.rawAnswer || item.raw_answer })).sort((a, b) => a.questionNumber - b.questionNumber);
        const summary = atelierNumber === 8
          ? { summary: answer, keyElements: [] }
          : await askClaude(sectionSummaryPrompt({ atelier, answers: completeAnswers }), true);
        await updateSection(client, user.id, atelierNumber, { interpreted_summary: summary.summary, key_elements: summary.keyElements, status: SECTION_STATUS.IN_PROGRESS });
      }
    } else if (action === "adjust") {
      if (atelierNumber === 8) return res.status(409).json({ error: "Motivul personal este păstrat exact și nu poate fi regenerat." });
      const adjustment = typeof req.body?.adjustment === "string" ? req.body.adjustment.trim() : "";
      if (!section?.interpreted_summary) return res.status(409).json({ error: "Nu există un rezumat de ajustat." });
      if (!adjustment || adjustment.length > MAX_ADJUSTMENT_LENGTH) return res.status(400).json({ error: "Ajustarea nu este validă." });
      const answers = atelierAnswers.map(item => ({ questionNumber: item.question_number, rawAnswer: item.raw_answer }));
      const summary = await askClaude(sectionSummaryPrompt({ atelier, answers, currentSummary: section.interpreted_summary, adjustment }), true);
      await updateSection(client, user.id, atelierNumber, { interpreted_summary: summary.summary, key_elements: summary.keyElements, status: SECTION_STATUS.REVIEW, confirmed_at: null });
    } else if (action === "summarize") {
      if (atelierAnswers.filter(item => item.raw_answer).length !== atelier.questions.length) return res.status(409).json({ error: "Finalizează toate întrebările înainte de rezumat." });
      const answers = atelierAnswers.map(item => ({ questionNumber: item.question_number, rawAnswer: item.raw_answer }));
      const summary = atelierNumber === 8
        ? { summary: answers[0].rawAnswer, keyElements: [] }
        : await askClaude(sectionSummaryPrompt({ atelier, answers }), true);
      await updateSection(client, user.id, atelierNumber, { interpreted_summary: summary.summary, key_elements: summary.keyElements, status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
    } else if (action === "confirm") {
      if (!section?.interpreted_summary) return res.status(409).json({ error: "Nu există un rezumat de confirmat." });
      const confirmedAt = new Date().toISOString();
      await updateSection(client, user.id, atelierNumber, { status: SECTION_STATUS.COMPLETED, confirmed_at: confirmedAt });
      if (records.blueprint?.status === BLUEPRINT_STATUS.COMPLETED) {
        records = await load(client, user.id);
        await regenerateCreatorDna(client, user.id, records);
      }
    } else if (action === "continue") {
      if (section?.status !== SECTION_STATUS.COMPLETED || atelierNumber >= 8) return res.status(409).json({ error: "Atelierul curent trebuie confirmat mai întâi." });
      await updateBlueprint(client, user.id, { current_atelier: atelierNumber + 1, status: BLUEPRINT_STATUS.IN_PROGRESS });
      await updateSection(client, user.id, atelierNumber + 1, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
    } else if (action === "pause") {
      // Schema aprobată nu are un câmp dedicat pauzei. Persistăm checkpoint-ul
      // numai prin atelierul curent, status, răspunsuri și secțiunea salvată.
      await updateBlueprint(client, user.id, { current_atelier: atelierNumber, status: records.blueprint?.status === BLUEPRINT_STATUS.COMPLETED ? BLUEPRINT_STATUS.COMPLETED : BLUEPRINT_STATUS.IN_PROGRESS });
    } else if (action === "generate_dna") {
      const allConfirmed = records.sections.filter(item => item.atelier_number >= 1 && item.atelier_number <= 8 && item.status === SECTION_STATUS.COMPLETED).length === 8;
      if (!allConfirmed) return res.status(409).json({ error: "Confirmă toate cele 8 ateliere înainte de a genera Creator DNA." });
      if (!records.creatorDna) await regenerateCreatorDna(client, user.id, records);
      await updateBlueprint(client, user.id, { current_atelier: 8, status: BLUEPRINT_STATUS.COMPLETED, completed_at: records.blueprint?.completed_at || new Date().toISOString() });
    } else if (action === "reset") {
      if (req.body?.confirm !== true) return res.status(400).json({ error: "Confirmă explicit că vrei să începi un Blueprint nou." });
      for (const table of ["creator_dna", "blueprint_answers", "blueprint_sections"]) {
        const removed = await client.from(table).delete().eq("user_id", user.id);
        if (removed.error) throw removed.error;
      }
      await updateBlueprint(client, user.id, { current_atelier: 1, status: BLUEPRINT_STATUS.NOT_STARTED, completed_at: null });
      records = await ensure(client, user.id, await load(client, user.id));
    } else return res.status(400).json({ error: "Acțiune necunoscută." });

    records = await load(client, user.id);
    return res.status(200).json({ ...responsePayload(records, true), paused: action === "pause" });
  } catch (error) {
    console.error("Blueprint API error:", error);
    return res.status(500).json({ error: persistenceErrorMessage(req.method) });
  }
}

export { MAX_ADJUSTMENT_LENGTH, MAX_ANSWER_LENGTH, persistenceErrorMessage };
