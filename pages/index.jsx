import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Esti NOVA - asistenta AI de marketing digital pentru antreprenori din Romania. Raspunzi MEREU in romana. Esti directa, energica, calda. Cand cineva cere continut intrebi INTAI tonul preferat (Profesional / Prietenos / Empatic / Motivational / Amuzant), apoi generezi. INTERZIS in continut generat: bani, castig, profit, venit, euro, imbogatire, venit pasiv. Inlocuieste cu: rezultate, impact, valoare, succes, libertate, timp pentru familie. Produse: 1. Academia AI 127 euro - avatare AI, brand faceless, 80% comision afiliere. 2. Elite Digital Course 299 euro - 7 limbi, bonusuri MRR 700 euro. 3. Pachet Business Premium 70 euro - 30 ghiduri MRR. 4. Pachet Master Gold 105 euro - 40 ghiduri + 6000 video faceless. 5. Business Start All-in-One 130 euro - 35 ghiduri + 20000 video. 6. Deblocarea Vanzarilor 27 euro - pentru buget mic, 60% comision. 7. Mindful Messaging 68 USD - vanzari prin DM, 70% comision.`;

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a78bfa", animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i*0.2}s` }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, gap: 10, alignItems: "flex-end" }}>
      {!isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="NOVA" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div>}
      <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px", background: isUser ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.06)", color: "#f8fafc", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", border: isUser ? "none" : "1px solid rgba(167,139,250,0.2)" }}>
        {msg.content}
      </div>
      {isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "Salut! Sunt NOVA - asistenta ta AI de marketing digital.\n\nCu ce incepem azi?\n\nPot genera:\n- Hook-uri virale pentru Reels\n- Scenarii complete Reels\n- Structuri Carusele\n- CTA-uri de engagement si vanzare\n- Captions\n\nSpecifica nisa ta si tonul dorit pentru continut personalizat!\n\nDISCLAIMER: Continutul generat este doar pentru uz personal. Redistribuirea accesului este interzisa." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const newMsgs = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
        body: JSON.stringify({ model: "llama-3.1-8b-instant",
