// pages/api/chat.js
// Ruta server-side care inlocuieste apelul direct din browser catre Anthropic.
// Cheia API nu mai ajunge niciodata in bundle-ul trimis clientului.

import { authenticatedClient } from "../../lib/server/supabase";
import { authorizeFounder } from "../../lib/server/founderAccess";
import { loadCreatorBlueprint, systemPromptWithCreatorBlueprint } from "../../lib/chat/creatorBlueprintContext";
import { loadCreatorDna, systemPromptWithCreatorDna } from "../../lib/chat/creatorDnaContext";
import {
  loadWorkingMemory,
  memoryExtractionRequest,
  saveExtractedMemory,
  systemPromptWithWorkingMemory,
  validateExtraction
} from "../../lib/chat/workingMemory";
import { EWA_CORE_BEHAVIOR } from "../../lib/prompts/ewaCoreBehavior";
import { loadChatContext, loadChatHistory, saveChatExchange } from "../../lib/chat/history";
import { AI_FEATURES, recordAnthropicUsage } from "../../lib/server/aiUsage";

const SYSTEM_PROMPT = `${EWA_CORE_BEHAVIOR}

IDENTITATE SI LIMBA
Esti EWA AI. Raspunzi in romana, cu exceptia cazului in care utilizatorul cere explicit alta limba. Esti clara, directa, calda si orientata spre actiune. Nu cere informatii deja disponibile in mesaj, istoricul conversatiei, Creator DNA sau Working Memory.

CONTINUITATEA CONVERSATIEI
Mesajele de conversatie libera furnizate in array-ul Anthropic \`messages\` reprezinta istoricul persistent disponibil al utilizatorului autentificat. Ele pot proveni din sesiuni anterioare de browser sau autentificare; limitele dintre sesiuni nu fac indisponibile mesajele care au fost furnizate. Daca o informatie exista in aceste mesaje, foloseste-o natural drept context anterior si nu afirma ca istoricul conversatiilor libere din sesiunile anterioare nu este disponibil. Ai acces numai la istoricul inclus in contextul curent, nu la toate conversatiile istorice. Daca informatia nu exista in mesajele furnizate, Creator Blueprint, Creator DNA sau Working Memory, nu pretinde ca ti-o amintesti. Acest context apartine exclusiv utilizatorului autentificat; nu sugera niciodata acces la conversatiile altui utilizator.
Raspunde natural la intrebarile utilizatorului si nu explica arhitectura interna decat daca ti se cere explicit. In conversatia obisnuita evita termenii interni inutili precum „Anthropic messages”, „Creator DNA”, „Creator Blueprint”, „Working Memory”, „persistent context”, „database”, „Supabase” sau „browser session”.

STIL DE LUCRU
- Foloseste limbaj simplu si practic.
- Prioritizeaza o recomandare clara cand contextul permite o alegere responsabila.
- Nu coplesi utilizatorul cu liste lungi de optiuni. Daca exista mai multe variante bune, recomanda una si explica pe scurt de ce.
- Pune intrebari numai cand raspunsul ar schimba material recomandarea sau cand lipseste o informatie indispensabila.
- Pentru un utilizator incepator, explica termenii necesari fara jargon inutil si nu presupune cunostinte de marketing.
- Pentru un utilizator cu expertiza profesionala, valorifica expertiza existenta chiar daca experienta lui in social media este zero.

PERSUASIUNE SI CONTINUT
Poti folosi cadre precum AIDA, PAS, Before/After/Bridge, FAB si PASTOR atunci cand sunt potrivite obiectivului. Foloseste psihologia consumatorului etic. Nu inventa dovezi sociale, rezultate, testimoniale, cifre, autoritate, raritate sau urgenta. Nu amplifica artificial frica sau vulnerabilitatea pentru a forta conversia. CTA-ul trebuie sa fie proportional cu etapa audientei si obiectivul continutului.

LIMITA PRODUSULUI
EWA ramane in sfera businessului, marketingului, continutului, pozitionarii, ofertelor si executiei aferente. Poate folosi intrebari reflective pentru obstacole de actiune, dar nu devine psiholog, terapeut sau diagnostician. Dupa clarificare, readuce conversatia catre business si urmatorul pas concret.`;

// Protectie minima impotriva abuzului: rate limiting in-memory per IP.
// NOTA: functiile serverless Vercel nu pastreaza memoria intre invocari in mod garantat
// (fiecare instanta poate avea propriul Map, iar instantele pot fi reciclate oricand).
// E o plasa de siguranta de bun-simt pentru etapa asta, NU o solutie definitiva.
// Solutia definitiva (rate limiting real, per user) vine odata cu Supabase Auth,
// cand putem lega limitele de user_id si status abonament, nu de IP.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minut
const RATE_LIMIT_MAX_REQUESTS = 15;     // 15 mesaje / minut / IP
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

const MAX_MESSAGE_LENGTH = 4000;  // caractere per mesaj

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metoda nu este permisa." });
  }

  const authorization = req.headers.authorization;
  const match = typeof authorization === "string"
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    return res.status(401).json({ error: "Autentificare necesara." });
  }

  let auth;
  try {
    auth = await authenticatedClient(req);
    if (!auth) return res.status(401).json({ error: "Sesiune invalida sau expirata." });
  } catch (error) {
    console.error("Eroare la verificarea autentificarii Supabase:", error);
    return res.status(500).json({ error: "Eroare de configurare server. Incearca mai tarziu." });
  }

  if (req.method === "GET") {
    try {
      const messages = await loadChatHistory(auth.client, auth.user.id);
      return res.status(200).json({ messages });
    } catch (error) {
      console.error("Eroare la incarcarea istoricului EWA:", error);
      return res.status(500).json({ error: "Nu am putut incarca istoricul conversatiei. Incearca din nou." });
    }
  }

  // History remains readable so expiration never hides or deletes user data;
  // only paid AI generation is protected.
  try {
    const authorization = await authorizeFounder(auth);
    if (!authorization.allowed) return res.status(403).json({ error: "subscription_required" });
  } catch (error) {
    console.error("Eroare la verificarea abonamentului Founder:", error);
    return res.status(500).json({ error: "Eroare de configurare server. Incearca mai tarziu." });
  }

  // Creator DNA remains server-side. A transient persistence failure must not
  // prevent an otherwise valid chat request from using the existing behavior.
  let creatorDna = null;
  try {
    creatorDna = await loadCreatorDna(auth.client, auth.user.id);
  } catch (error) {
    console.error("Eroare la incarcarea Creator DNA pentru chat:", error);
  }

  // Confirmed Creator Blueprint decisions are a separate strategic layer from
  // the generated Creator DNA. Loading remains best-effort so chat stays
  // available during a transient Blueprint persistence failure.
  let creatorBlueprint = [];
  try {
    creatorBlueprint = await loadCreatorBlueprint(auth.client, auth.user.id);
  } catch (error) {
    console.error("Eroare la incarcarea Creator Blueprint pentru chat:", error);
  }

  // Working Memory is queried with the authenticated Supabase client. Its RLS
  // token and this server-derived user id provide defense in depth.
  let workingMemory = [];
  try {
    workingMemory = await loadWorkingMemory(auth.client, auth.user.id);
  } catch (error) {
    console.error("Eroare la incarcarea Working Memory pentru chat:", error);
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Prea multe cereri. Incearca din nou in cateva momente." });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res.status(400).json({ error: "Lipseste mesajul." });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: "Mesajul este prea lung." });
  }

  let messages;
  try {
    const history = await loadChatContext(auth.client, auth.user.id);
    messages = [...history, { role: "user", content: message }];
  } catch (error) {
    console.error("Eroare la incarcarea contextului EWA:", error);
    return res.status(500).json({ error: "Nu am putut incarca istoricul conversatiei. Incearca din nou." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY lipseste din variabilele de mediu.");
    return res.status(500).json({ error: "Eroare de configurare server. Incearca mai tarziu." });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPromptWithWorkingMemory(
          systemPromptWithCreatorBlueprint(
            systemPromptWithCreatorDna(SYSTEM_PROMPT, creatorDna),
            creatorBlueprint
          ),
          workingMemory
        ),
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Eroare Anthropic API:", anthropicRes.status, errBody);
      return res.status(502).json({ error: "Eroare la generarea raspunsului. Incearca din nou." });
    }

    const data = await anthropicRes.json();
    await recordAnthropicUsage({ userId: auth.user.id, feature: AI_FEATURES.CHAT, response: data });
    const reply = data.content?.[0]?.text || "Nu am putut genera un raspuns. Incearca din nou.";

    try {
      await saveChatExchange(auth.client, message, reply);
    } catch (error) {
      console.error("Eroare la salvarea istoricului EWA:", error);
      return res.status(500).json({ error: "Nu am putut salva conversatia. Incearca din nou." });
    }

    // Working Memory persistence remains best-effort and happens only after the
    // durable chat exchange was saved. Extraction/database errors cannot turn a
    // successfully saved chat into an error response.
    try {
      const latestUserMessage = [...messages].reverse().find(message => message.role === "user")?.content;
      if (latestUserMessage) {
        const extractionRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(memoryExtractionRequest(latestUserMessage, reply))
        });

        if (!extractionRes.ok) {
          console.error("Extractia Working Memory a esuat:", extractionRes.status);
        } else {
          const extractionData = await extractionRes.json();
          await recordAnthropicUsage({ userId: auth.user.id, feature: AI_FEATURES.MEMORY, response: extractionData });
          const extractionText = extractionData.content?.[0]?.text;
          // This text is emitted under Anthropic's strict json_schema output
          // contract; local validation remains mandatory before persistence.
          const extraction = typeof extractionText === "string"
            ? validateExtraction(JSON.parse(extractionText))
            : null;
          if (extraction) {
            await saveExtractedMemory(auth.client, auth.user.id, extraction, workingMemory, latestUserMessage);
          }
        }
      }
    } catch (error) {
      console.error("Eroare non-critica la actualizarea Working Memory:", error);
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Eroare neasteptata in /api/chat:", err);
    return res.status(500).json({ error: "Eroare de server. Incearca din nou." });
  }
}
