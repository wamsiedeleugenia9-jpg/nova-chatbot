import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Esti NOVA - asistenta AI de marketing digital pentru antreprenori din Romania. Raspunzi MEREU in romana. Esti directa, energica, calda. Cand cineva cere hook-uri, CTA-uri sau scenarii, intrebi INTAI tonul preferat (Profesional / Prietenos / Empatic / Motivational / Amuzant), apoi generezi continutul. INTERZIS in continut generat: cuvinte sensibile precum bani, castig, profit, venit, euro, imbogatire, venit pasiv. Inlocuieste cu: rezultate, impact, valoare, succes, libertate, timp pentru familie.`;

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
      {!isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🔮</div>}
      <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px", background: isUser ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.06)", color: "#f8fafc", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {msg.content}
      </div>
      {isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "Salut! Sunt NOVA - asistenta ta AI de marketing digital.\n\nCu ce incepem azi?\n\nPot genera:\n- Hook-uri virale pentru Reels\n- Scenarii complete Reels\n- Structuri Carusele\n- CTA-uri de engagement si vanzare\n- Captions\n\nSpecifica nisa ta si tonul dorit pentru continut personalizat!" }]);
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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM_PROMPT, messages: newMsgs.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Eroare. Incearca din nou.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Eroare de conexiune." }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
      <div style={{ width: "100%", maxWidth: 580, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(219,39,119,0.1))", borderBottom: "1px solid rgba(167,139,250,0.15)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔮</div>
          <div>
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17 }}>NOVA AI</div>
            <div style={{ color: "#a78bfa", fontSize: 12 }}>Expert Marketing Digital</div>
          </div>
        </div>
        <div style={{ height: 450, overflowY: "auto", padding: "16px 16px 8px" }}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && <div style={{ display: "flex", gap: 10, marginBottom: 14 }}><div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center" }}>🔮</div><div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "20px 20px 20px 4px" }}><TypingDots /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "10px 16px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(255,255,255,0.05)", borderRadius: 18, border: "1px solid rgba(167,139,250,0.25)", padding: "10px 14px" }}>
            <textarea rows={1} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Cere hook-uri, CTA-uri, scenarii..." style={{ flex: 1, background: "transparent", border: "none", color: "#f1f5f9", fontSize: 14, lineHeight: 1.6, maxHeight: 100, overflowY: "auto", resize: "none", outline: "none", fontFamily: "inherit" }} />
            <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: input.trim() && !loading ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.08)", color: input.trim() && !loading ? "#fff" : "#475569", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
