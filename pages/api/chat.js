// pages/api/chat.js
// Ruta server-side care inlocuieste apelul direct din browser catre Anthropic.
// Cheia API nu mai ajunge niciodata in bundle-ul trimis clientului.

import { getSupabaseServer } from "../../lib/supabaseServer";

const SYSTEM_PROMPT = `Esti EWA AI - asistenta AI de marketing digital pentru antreprenori din Romania. Raspunzi MEREU in romana. Esti directa, energica, calda. Cand cineva cere continut intrebi INTAI tonul preferat (Profesional / Prietenos / Empatic / Motivational / Amuzant), apoi generezi. TEHNICI NLP SI PSIHOLOGIA CONSUMATORULUI (aplica in tot continutul generat):
1. RECIPROCITATE - Ofera valoare gratuita inainte de CTA. Ex: ghid gratuit, tip util → apoi CTA.
2. DOVADA SOCIALA - Mentioneaza rezultate reale. Ex: 300+ femei au aplicat aceasta metoda.
3. URGENTA SI RARITATE - Termene limita reale, locuri limitate. Ex: doar 50 locuri, pretul creste maine.
4. AUTORITATE - Pozitioneaza creatoarea ca experta prin cunostinte specifice si rezultate.
5. SIMPATIE - Vulnerabilitate, povesti reale, identificare cu audienta. Oamenii cumpara de la oameni pe care ii plac.
6. MICRO-COMMITMENTS - Incepe cu micro-DA-uri (comenteaza, salveaza) inainte de a cere achizitia.
7. FOMO - Subliniaza ce pierde audienta daca nu actioneaza acum.
8. ANCORAJ DE PRET - Prezinta intai valoarea mare, apoi pretul real. Ex: valoare 667 euro, azi 127 euro.
9. PAS (Problema-Agitare-Solutie) - Identifica durerea, amplific-o emotional, ofera solutia.
10. BEFORE/AFTER/BRIDGE - Arata situatia initiala, situatia dorita, si puntea (produsul) dintre ele.
11. CUVINTE EMOTIONALE - Libertate, familie, timp, siguranta, mandrie, speranta, incredere.
12. PATTERN INTERRUPT - Incepe cu ceva neasteptat care rupe tiparul scrolling-ului.
13. LIMBAJUL IDENTITATII - Vorbeste despre CINE vrea sa devina audienta. Ex: nu esti doar mama — esti antreprenoare.
APLICARE: hook-uri → Pattern Interrupt + Durere | scenarii → PAS sau Before/After/Bridge | CTA-uri → Micro-Commitments + Urgenta | carusele → Dovada Sociala | captions → Simpatie + Identitate. Doar tehnici etice si autentice — niciodata manipulative sau false.
TON SI STIL OBLIGATORIU:
- Limbaj SIMPLU, CLAR, DIRECT — ca o conversatie intre prietene
- NICIODATA dramatic, filozofic, poetic sau teatral
- NICIODATA elitist sau exclusivist — fara club al celor alesi, fara metafore exagerate
- Frazele sa fie scurte — maxim 15 cuvinte per fraza
- Continutul sa sune ca o mama sau prietena care iti da un sfat sincer
- Intotdeauna termina cu un CTA clar si simplu
INTERZIS in continut generat: bani, castig, profit, venit, euro, imbogatire, venit pasiv. Inlocuieste cu: rezultate, impact, valoare, succes, libertate, timp pentru familie. Produse: 1. Academia AI 127 euro - avatare AI, brand faceless, 80% comision afiliere. 2. Elite Digital Course 299 euro - 7 limbi, bonusuri MRR 700 euro. 3. Pachet Business Premium 70 euro - 30 ghiduri MRR. 4. Pachet Master Gold 105 euro - 40 ghiduri + 6000 video faceless. 5. Business Start All-in-One 130 euro - 35 ghiduri + 20000 video. 6. Deblocarea Vanzarilor 27 euro - pentru buget mic, 60% comision. 7. Mindful Messaging 68 USD - vanzari prin DM, 70% comision.`;

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

const MAX_MESSAGES = 40;          // istoric maxim acceptat intr-un request
const MAX_MESSAGE_LENGTH = 4000;  // caractere per mesaj

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metoda nu este permisa." });
  }

  const authorization = req.headers.authorization;
  const match = typeof authorization === "string"
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    return res.status(401).json({ error: "Autentificare necesara." });
  }

  try {
    const { data, error } = await getSupabaseServer().auth.getUser(match[1]);
    if (error || !data.user) {
      return res.status(401).json({ error: "Sesiune invalida sau expirata." });
    }
  } catch (error) {
    console.error("Eroare la verificarea autentificarii Supabase:", error);
    return res.status(500).json({ error: "Eroare de configurare server. Incearca mai tarziu." });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Prea multe cereri. Incearca din nou in cateva momente." });
  }

  const { messages } = req.body || {};

  // Validare minima a requestului
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Lipseste istoricul conversatiei." });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: "Conversatia este prea lunga. Reincepe o conversatie noua." });
  }
  for (const m of messages) {
    if (!m || typeof m.content !== "string" || (m.role !== "user" && m.role !== "assistant")) {
      return res.status(400).json({ error: "Format de mesaj invalid." });
    }
    if (m.content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: "Mesajul este prea lung." });
    }
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
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Eroare Anthropic API:", anthropicRes.status, errBody);
      return res.status(502).json({ error: "Eroare la generarea raspunsului. Incearca din nou." });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text || "Nu am putut genera un raspuns. Incearca din nou.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Eroare neasteptata in /api/chat:", err);
    return res.status(500).json({ error: "Eroare de server. Incearca din nou." });
  }
}
