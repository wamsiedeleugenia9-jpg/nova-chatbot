import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Esti NOVA - asistenta AI de marketing digital pentru antreprenori din Romania. Raspunzi MEREU in romana. Esti directa, energica, calda. Cand cineva cere continut intrebi INTAI tonul preferat (Profesional / Prietenos / Empatic / Motivational / Amuzant), apoi generezi. TEHNICI NLP SI PSIHOLOGIA CONSUMATORULUI (aplica in tot continutul generat):
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

INTERZIS in continut generat: bani, castig, profit, venit, euro, imbogatire, venit pasiv. Inlocuieste cu: rezultate, impact, valoare, succes, libertate, timp pentru familie. Produse: 1. Academia AI 127 euro - avatare AI, brand faceless, 80% comision afiliere. 2. Elite Digital Course 299 euro - 7 limbi, bonusuri MRR 700 euro. 3. Pachet Business Premium 70 euro - 30 ghiduri MRR. 4. Pachet Master Gold 105 euro - 40 ghiduri + 6000 video faceless. 5. Business Start All-in-One 130 euro - 35 ghiduri + 20000 video. 6. Deblocarea Vanzarilor 27 euro - pentru buget mic, 60% comision. 7. Mindful Messaging 68 USD - vanzari prin DM, 70% comision.`;

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
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.NEXT_PUBLIC_GROQ_API_KEY },
        body: JSON.stringify({ model: "llama-3.1-8b-instant", max_tokens: 1000, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...newMsgs.map(m => ({ role: m.role, content: m.content }))] })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Eroare. Incearca din nou.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Eroare de conexiune. Incearca din nou." }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Georgia, serif" }}>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}} @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(167,139,250,0.2)}50%{box-shadow:0 0 60px rgba(219,39,119,0.3)}} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:2px} textarea{resize:none;font-family:inherit;outline:none}`}</style>
      <div style={{ width: "100%", maxWidth: 580, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", overflow: "hidden", animation: "glow 5s ease-in-out infinite" }}>
        <div style={{ padding: "18px 22px", background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(219,39,119,0.1))", borderBottom: "1px solid rgba(167,139,250,0.15)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0, boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="NOVA" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div>
          <div>
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17 }}>NOVA AI</div>
            <div style={{ color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />Expert Marketing Digital</div>
          </div>
        </div>
        <div style={{ height: 450, overflowY: "auto", padding: "16px 16px 8px" }}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}><div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden" }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="NOVA" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div><div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "20px 20px 20px 4px", border: "1px solid rgba(167,139,250,0.2)" }}><TypingDots /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "10px 16px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(255,255,255,0.05)", borderRadius: 18, border: "1px solid rgba(167,139,250,0.25)", padding: "10px 14px" }}>
            <textarea rows={1} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Cere hook-uri, CTA-uri, scenarii..." style={{ flex: 1, background: "transparent", border: "none", color: "#f1f5f9", fontSize: 14, lineHeight: 1.6, maxHeight: 100, overflowY: "auto" }} />
            <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: input.trim() && !loading ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.08)", color: input.trim() && !loading ? "#fff" : "#475569", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
