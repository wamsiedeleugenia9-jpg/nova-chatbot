import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

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

function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setInfo("");
  }

  async function submit() {
    if (mode === "forgot") {
      if (!email.trim()) return;
      setLoading(true);
      setError("");
      setInfo("");
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined
        });
        if (error) {
          setError("Nu am putut trimite emailul. Verifica adresa si incearca din nou.");
        } else {
          setInfo("Ti-am trimis un email cu un link de resetare a parolei.");
        }
      } catch {
        setError("Eroare de conexiune. Incearca din nou.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) {
          setError("Email sau parola incorecte.");
        } else {
          onAuthenticated();
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) {
          setError(error.message === "User already registered"
            ? "Acest email este deja inregistrat. Incearca sa te loghezi."
            : "Nu am putut crea contul. Incearca din nou.");
        } else {
          setInfo("Bine ai venit! Verifica emailul pentru confirmare, apoi loghează-te.");
          switchMode("login");
        }
      }
    } catch {
      setError("Eroare de conexiune. Incearca din nou.");
    } finally {
      setLoading(false);
    }
  }

  const heading = mode === "login" ? "Bine ai revenit"
    : mode === "signup" ? "Hai sa-ti construim contul"
    : "Resetam parola, fara griji";

  const subheading = mode === "login" ? "Continua acolo unde ai ramas"
    : mode === "signup" ? "Cateva secunde si esti inauntru"
    : "Iti trimitem un link pe email";

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "Georgia, serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", padding: "clamp(28px, 7vw, 40px) clamp(22px, 6vw, 32px)", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", margin: "0 auto 18px", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
          <img src="https://i.imgur.com/UUrViWA.jpeg" alt="EWA AI" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 21 }}>{heading}</div>
        <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 26, marginTop: 4 }}>{subheading}</div>

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && mode === "forgot" && submit()}
          placeholder="Emailul tau"
          style={{ width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: 15, marginBottom: 10, boxSizing: "border-box", outline: "none", fontFamily: "Georgia, serif" }}
        />

        {mode !== "forgot" && (
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Parola ta"
            style={{ width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: 15, marginBottom: 8, boxSizing: "border-box", outline: "none", fontFamily: "Georgia, serif" }}
          />
        )}

        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 14 }}>
            <span onClick={() => switchMode("forgot")} style={{ color: "#a78bfa", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
              Ai uitat parola?
            </span>
          </div>
        )}
        {mode !== "login" && <div style={{ marginBottom: 6 }} />}

        {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {info && <div style={{ color: "#34d399", fontSize: 13, marginBottom: 12 }}>{info}</div>}

        <button
          onClick={submit}
          disabled={loading || !email.trim() || (mode !== "forgot" && !password.trim())}
          style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: (email.trim() && (mode === "forgot" || password.trim()) && !loading) ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.08)", color: (email.trim() && (mode === "forgot" || password.trim()) && !loading) ? "#fff" : "#475569", fontSize: 15, fontWeight: 600, cursor: (email.trim() && (mode === "forgot" || password.trim()) && !loading) ? "pointer" : "not-allowed", fontFamily: "Georgia, serif" }}
        >
          {loading ? "Se proceseaza..." : mode === "login" ? "Loghează-te" : mode === "signup" ? "Creeaza cont" : "Trimite link de resetare"}
        </button>

        <div style={{ marginTop: 20, fontSize: 13, color: "#a78bfa" }}>
          {mode === "login" && (
            <>Nu ai cont inca? <span onClick={() => switchMode("signup")} style={{ color: "#f8fafc", cursor: "pointer", textDecoration: "underline" }}>Creeaza unul</span></>
          )}
          {mode === "signup" && (
            <>Ai deja cont? <span onClick={() => switchMode("login")} style={{ color: "#f8fafc", cursor: "pointer", textDecoration: "underline" }}>Loghează-te</span></>
          )}
          {mode === "forgot" && (
            <>Ti-ai amintit parola? <span onClick={() => switchMode("login")} style={{ color: "#f8fafc", cursor: "pointer", textDecoration: "underline" }}>Inapoi la login</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!password.trim() || password.length < 6) {
      setError("Parola trebuie sa aiba cel putin 6 caractere.");
      return;
    }
    if (password !== confirm) {
      setError("Parolele nu coincid.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Nu am putut actualiza parola. Incearca din nou.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Eroare de conexiune. Incearca din nou.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "Georgia, serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,0.03)", borderRadius: 28, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", padding: "clamp(28px, 7vw, 40px) clamp(22px, 6vw, 32px)", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 21, marginBottom: 4 }}>Alege o parola noua</div>
        {done ? (
          <div>
            <div style={{ color: "#34d399", fontSize: 14, marginTop: 16, marginBottom: 20 }}>
              Parola a fost schimbata. Poti continua in EWA AI.
            </div>
            <button
              onClick={onDone}
              style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #6d28d9, #db2777)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Georgia, serif" }}
            >
              Continua
            </button>
          </div>
        ) : (
          <>
            <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 24 }}>Ultimul pas inainte sa continui</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Parola noua"
              style={{ width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: 15, marginBottom: 10, boxSizing: "border-box", outline: "none", fontFamily: "Georgia, serif" }}
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Confirma parola noua"
              style={{ width: "100%", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "Georgia, serif" }}
            />
            {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={submit}
              disabled={loading}
              style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: !loading ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.08)", color: !loading ? "#fff" : "#475569", fontSize: 15, fontWeight: 600, cursor: !loading ? "pointer" : "not-allowed", fontFamily: "Georgia, serif" }}
            >
              {loading ? "Se salveaza..." : "Salveaza parola noua"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = se verifica, null = neautentificat
  const [recovering, setRecovering] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Salut! Sunt EWA AI - asistenta ta AI de marketing digital, creata de EWA.\n\nCu ce incepem azi?\n\nPot genera:\n- Hook-uri virale pentru Reels\n- Scenarii complete Reels\n- Structuri Carusele\n- CTA-uri de engagement si vanzare\n- Captions\n\nSpecifica nisa ta si tonul dorit pentru continut personalizat!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa", fontFamily: "Georgia, serif" }}>
        Se incarca...
      </div>
    );
  }

  if (recovering) {
    return <ResetPasswordForm onDone={() => setRecovering(false)} />;
  }

  if (!session) return <AuthGate onAuthenticated={() => {}} />;

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
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17 }}>EWA AI</div>
            <div style={{ color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />EWA AI | Marketing Digital</div>
          </div>
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 12, padding: "6px 12px", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Delogare
          </button>
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
