const BLUEPRINT_CONTENT = require("../../content/creator-blueprint.json");
const { BLUEPRINT_STATUS, SECTION_STATUS, blueprintState } = require("../../lib/blueprint/state");
const { blueprintInterpretationPrompt } = require("../../lib/prompts/creatorBlueprint");
const { authenticatedClient } = require("../../lib/server/supabase");

const ATELIER_NUMBER = BLUEPRINT_CONTENT.atelier.number;
const QUESTION_NUMBER = BLUEPRINT_CONTENT.atelier.question.number;
const MAX_ANSWER_LENGTH = 8000;
const MAX_ADJUSTMENT_LENGTH = 2000;

async function generateInterpretation(values) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic server configuration is missing");
  const prompt = blueprintInterpretationPrompt(values);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.message }]
    })
  });
  if (!response.ok) {
    console.error("Blueprint Anthropic error:", response.status, await response.text());
    throw new Error("Anthropic request failed");
  }
  const data = await response.json();
  const interpretation = data.content?.find(item => item.type === "text")?.text?.trim();
  if (!interpretation) throw new Error("Anthropic returned an empty interpretation");
  return interpretation;
}

async function loadRecords(client, userId) {
  const [blueprintResult, sectionResult, answerResult] = await Promise.all([
    client.from("creator_blueprints").select("id,current_atelier,status,completed_at").eq("user_id", userId).maybeSingle(),
    client.from("blueprint_sections").select("id,status,confirmed_at").eq("user_id", userId).eq("atelier_number", ATELIER_NUMBER).maybeSingle(),
    client.from("blueprint_answers").select("id,raw_answer,interpreted_answer,adjustment_request").eq("user_id", userId).eq("atelier_number", ATELIER_NUMBER).eq("question_number", QUESTION_NUMBER).maybeSingle()
  ]);
  const error = blueprintResult.error || sectionResult.error || answerResult.error;
  if (error) throw error;
  return { blueprint: blueprintResult.data, section: sectionResult.data, answer: answerResult.data };
}

async function ensureRecords(client, userId, records) {
  if (!records.blueprint) {
    const result = await client.from("creator_blueprints").upsert({
      user_id: userId, current_atelier: ATELIER_NUMBER, status: BLUEPRINT_STATUS.NOT_STARTED, updated_at: new Date().toISOString()
    }, { onConflict: "user_id", ignoreDuplicates: true });
    if (result.error) throw result.error;
  }
  if (!records.section) {
    const result = await client.from("blueprint_sections").upsert({
      user_id: userId, atelier_number: ATELIER_NUMBER, status: SECTION_STATUS.NOT_STARTED, updated_at: new Date().toISOString()
    }, { onConflict: "user_id,atelier_number", ignoreDuplicates: true });
    if (result.error) throw result.error;
  }
  return loadRecords(client, userId);
}

async function updateSection(client, userId, values) {
  const result = await client.from("blueprint_sections").update({ ...values, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("atelier_number", ATELIER_NUMBER);
  if (result.error) throw result.error;
}

async function markBlueprintInProgress(client, userId) {
  const result = await client.from("creator_blueprints").update({
    current_atelier: ATELIER_NUMBER, status: BLUEPRINT_STATUS.IN_PROGRESS,
    completed_at: null, updated_at: new Date().toISOString()
  }).eq("user_id", userId);
  if (result.error) throw result.error;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
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
    let records = await ensureRecords(client, user.id, await loadRecords(client, user.id));
    if (req.method === "GET") return res.status(200).json({ content: BLUEPRINT_CONTENT, state: blueprintState(records.blueprint, records.section, records.answer) });

    const action = req.body?.action;
    if (action === "start") {
      await markBlueprintInProgress(client, user.id);
      await updateSection(client, user.id, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
    } else if (action === "submit") {
      const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
      if (!answer || answer.length > MAX_ANSWER_LENGTH) return res.status(400).json({ error: `Răspunsul trebuie să aibă între 1 și ${MAX_ANSWER_LENGTH} de caractere.` });
      const result = await client.from("blueprint_answers").upsert({
        user_id: user.id, atelier_number: ATELIER_NUMBER, question_number: QUESTION_NUMBER,
        raw_answer: answer, interpreted_answer: null, adjustment_request: null, updated_at: new Date().toISOString()
      }, { onConflict: "user_id,atelier_number,question_number" });
      if (result.error) throw result.error;
      await markBlueprintInProgress(client, user.id);
      await updateSection(client, user.id, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
      const interpretation = await generateInterpretation({ answer });
      const interpretationResult = await client.from("blueprint_answers").update({ interpreted_answer: interpretation, updated_at: new Date().toISOString() })
        .eq("user_id", user.id).eq("atelier_number", ATELIER_NUMBER).eq("question_number", QUESTION_NUMBER).eq("raw_answer", answer);
      if (interpretationResult.error) throw interpretationResult.error;
    } else if (action === "adjust") {
      const adjustment = typeof req.body?.adjustment === "string" ? req.body.adjustment.trim() : "";
      if (!records.answer?.raw_answer || !records.answer?.interpreted_answer) return res.status(409).json({ error: "Trimite mai întâi un răspuns." });
      if (!adjustment || adjustment.length > MAX_ADJUSTMENT_LENGTH) return res.status(400).json({ error: `Ajustarea trebuie să aibă între 1 și ${MAX_ADJUSTMENT_LENGTH} de caractere.` });
      const adjustmentResult = await client.from("blueprint_answers").update({ adjustment_request: adjustment, updated_at: new Date().toISOString() })
        .eq("user_id", user.id).eq("atelier_number", ATELIER_NUMBER).eq("question_number", QUESTION_NUMBER);
      if (adjustmentResult.error) throw adjustmentResult.error;
      const interpretation = await generateInterpretation({ answer: records.answer.raw_answer, currentInterpretation: records.answer.interpreted_answer, adjustment });
      const result = await client.from("blueprint_answers").update({ interpreted_answer: interpretation, updated_at: new Date().toISOString() })
        .eq("user_id", user.id).eq("atelier_number", ATELIER_NUMBER).eq("question_number", QUESTION_NUMBER);
      if (result.error) throw result.error;
      await markBlueprintInProgress(client, user.id);
      await updateSection(client, user.id, { status: SECTION_STATUS.IN_PROGRESS, confirmed_at: null });
    } else if (action === "confirm") {
      if (!records.answer?.interpreted_answer) return res.status(409).json({ error: "Nu există o interpretare de confirmat." });
      await updateSection(client, user.id, { status: SECTION_STATUS.COMPLETED, confirmed_at: new Date().toISOString() });
    } else {
      return res.status(400).json({ error: "Acțiune necunoscută." });
    }

    records = await loadRecords(client, user.id);
    return res.status(200).json({ content: BLUEPRINT_CONTENT, state: blueprintState(records.blueprint, records.section, records.answer) });
  } catch (error) {
    console.error("Blueprint API error:", error);
    return res.status(500).json({ error: "Nu am putut salva progresul. Încearcă din nou." });
  }
}

export { ATELIER_NUMBER, MAX_ADJUSTMENT_LENGTH, MAX_ANSWER_LENGTH, QUESTION_NUMBER };
