import { useState, useRef, useEffect } from "react";

// SYSTEM_PROMPT a fost mutat exclusiv server-side, in pages/api/chat.js.
// Frontend-ul nu mai contine niciun prompt, nicio cheie API.

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
      {!isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="EWA AI" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div>}
      <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px", background: isUser ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.06)", color: "#f8fafc", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", border: isUser ? "none" : "1px solid rgba(167,139,250,0.2)" }}>
        {msg.content}
      </div>
      {isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>}
    </div>
  );
}

function AccessGate({ onAccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim() })
      });
      if (res.ok) {
        onAccess();
      } else {
        setError("Cod invalid. Verifica emailul de confirmare.");
      }
    } catch {
      setError("Eroare de conexiune. Incearca din nou.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Georgia, serif" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", padding: "40px 32px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", margin: "0 auto 20px", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
          <img src="https://i.imgur.com/UUrViWA.jpeg" alt="EWA AI" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>EWA AI</div>
        <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 32 }}>Introdu codul de acces primit prin email</div>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === "Enter" && verify()}
          placeholder="Codul tau unic..."
          style={{ width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "Georgia, serif" }}
        />
        {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button
          onClick={verify}
          disabled={loading || !code.trim()}
          style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: code.trim() && !loading ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.08)", color: code.trim() && !loading ? "#fff" : "#475569", fontSize: 15, fontWeight: 600, cursor: code.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "Georgia, serif" }}
        >
          {loading ? "Se verifica..." : "Acceseaza EWA AI"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [accessed, setAccessed] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Salut! Sunt EWA AI - asistenta ta AI de marketing digital, creata de EWA.\n\nCu ce incepem azi?\n\nPot genera:\n- Hook-uri virale pentru Reels\n- Scenarii complete Reels\n- Structuri Carusele\n- CTA-uri de engagement si vanzare\n- Captions\n\nSpecifica nisa ta si tonul dorit pentru continut personalizat!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  if (!accessed) return <AccessGate onAccess={() => setAccessed(true)} />;

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const newMsgs = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.error || "Eroare. Incearca din nou." }]);
        return;
      }
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Eroare de conexiune. Incearca din nou." }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "Georgia, serif" }}>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}} @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(167,139,250,0.2)}50%{box-shadow:0 0 60px rgba(219,39,119,0.3)}} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:2px} textarea{resize:none;font-family:inherit;outline:none}`}</style>
      <div style={{ width: "100%", maxWidth: 580, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", overflow: "hidden", animation: "glow 5s ease-in-out infinite" }}>
        <div style={{ padding: "18px 22px", background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(219,39,119,0.1))", borderBottom: "1px solid rgba(167,139,250,0.15)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0, boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="EWA AI" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div>
          <div>
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17 }}>EWA AI</div>
            <div style={{ color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />EWA AI | Marketing Digital</div>
          </div>
        </div>
        <div style={{ height: 450, overflowY: "auto", padding: "16px 16px 8px" }}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}><div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden" }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="EWA AI" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div><div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "20px 20px 20px 4px", border: "1px solid rgba(167,139,250,0.2)" }}><TypingDots /></div></div>}
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
