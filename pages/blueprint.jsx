import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const shell = { minHeight: "100vh", background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 45%, #0a0a0f 100%)", color: "#f8fafc", padding: "32px 16px", fontFamily: "Georgia, serif" };
const card = { maxWidth: 720, margin: "0 auto", padding: "clamp(24px, 6vw, 48px)", borderRadius: 28, background: "rgba(255,255,255,.04)", border: "1px solid rgba(167,139,250,.22)", boxShadow: "0 30px 80px rgba(0,0,0,.55)" };
const button = { border: 0, borderRadius: 14, padding: "13px 20px", color: "white", background: "linear-gradient(135deg,#6d28d9,#db2777)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 15 };

export default function Blueprint() {
  const [session, setSession] = useState(undefined);
  const [content, setContent] = useState(null);
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    request(session, "GET").then(update).catch(showError);
  }, [session]);

  function update(data) {
    setContent(data.content);
    setState(data.state);
    setAnswer(data.state.rawAnswer || "");
    setAdjustment("");
    setShowAdjustment(false);
    setError("");
  }

  function showError(err) { setError(err.message || "A apărut o eroare."); }

  async function request(currentSession, method, body) {
    const response = await fetch("/api/blueprint", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentSession.access_token}` },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "A apărut o eroare.");
    return data;
  }

  async function act(body) {
    setBusy(true); setError("");
    try { update(await request(session, "POST", body)); }
    catch (err) { showError(err); }
    finally { setBusy(false); }
  }

  if (session === undefined || (session && !content)) return <main style={shell}><div style={card}>Se încarcă…</div></main>;
  if (!session) return (
    <main style={shell}><div style={{ ...card, textAlign: "center" }}>
      <h1>Creator Blueprint</h1>
      <p style={{ color: "#c4b5fd", lineHeight: 1.7 }}>Autentifică-te pentru a începe sau a continua Blueprint-ul.</p>
      <a href="/" style={{ ...button, display: "inline-block", textDecoration: "none" }}>Mergi la autentificare</a>
    </div></main>
  );

  const question = content.atelier.question;
  return (
    <main style={shell}>
      <div style={card}>
        <div style={{ color: "#a78bfa", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>EWA · Creator Blueprint</div>
        {content.contentStatus?.startsWith("temporary-placeholder") && <div role="note" style={{ marginTop: 18, padding: 12, borderRadius: 12, color: "#fde68a", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", fontSize: 13 }}>Conținut temporar pentru dezvoltare — formularea oficială EWA MVP este încă necesară.</div>}
        {!state.started ? <>
          <h1 style={{ fontSize: "clamp(32px,7vw,52px)", marginBottom: 14 }}>{content.title}</h1>
          <p style={{ color: "#ddd6fe", lineHeight: 1.8, fontSize: 17 }}>{content.introduction}</p>
          <button disabled={busy} onClick={() => act({ action: "start" })} style={button}>{busy ? "Se pregătește…" : "Începe Blueprint-ul"}</button>
        </> : <>
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(167,139,250,.2)" }}>
            <h1 style={{ fontSize: 30, marginBottom: 8 }}>{content.atelier.title}</h1>
            <p style={{ color: "#c4b5fd", lineHeight: 1.75 }}>{content.atelier.introduction}</p>
          </div>
          <section style={{ marginTop: 28, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)", border: "1px solid rgba(167,139,250,.2)" }}>
            <div style={{ color: "#f0abfc", fontSize: 13, marginBottom: 10 }}>ÎNTREBAREA {question.number}</div>
            <h2 style={{ fontSize: 22, lineHeight: 1.45 }}>{question.text}</h2>
            {!state.interpretation && <>
              <textarea aria-label="Răspunsul tău" value={answer} onChange={event => setAnswer(event.target.value)} disabled={busy} placeholder="Scrie răspunsul tău aici…" rows={8} maxLength={8000} style={{ width: "100%", boxSizing: "border-box", margin: "14px 0", padding: 16, borderRadius: 14, background: "rgba(5,5,15,.65)", color: "#f8fafc", border: "1px solid rgba(167,139,250,.35)", font: "15px/1.6 Georgia,serif", resize: "vertical" }} />
              <button disabled={busy || !answer.trim()} onClick={() => act({ action: "submit", answer })} style={{ ...button, opacity: busy || !answer.trim() ? .5 : 1 }}>{busy ? "EWA interpretează răspunsul…" : "Trimite răspunsul"}</button>
            </>}
            {state.interpretation && <div style={{ marginTop: 22 }}>
              <div style={{ color: "#a78bfa", fontSize: 13 }}>INTERPRETAREA EWA</div>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 17 }}>{state.interpretation}</p>
              {state.completed ? <div role="status" style={{ marginTop: 18, padding: 16, borderRadius: 14, color: "#6ee7b7", background: "rgba(16,185,129,.1)", border: "1px solid rgba(52,211,153,.25)" }}>✓ Întrebarea 1 este finalizată. Blueprint-ul se oprește aici pentru moment.</div> : <>
                {!showAdjustment && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button disabled={busy} onClick={() => act({ action: "confirm" })} style={button}>Da, mă reprezintă</button>
                  <button disabled={busy} onClick={() => setShowAdjustment(true)} style={{ ...button, background: "transparent", border: "1px solid #a78bfa" }}>Vreau o ajustare</button>
                </div>}
                {showAdjustment && <div>
                  <textarea aria-label="Ajustarea dorită" value={adjustment} onChange={event => setAdjustment(event.target.value)} rows={4} maxLength={2000} placeholder="Spune ce nu te reprezintă sau ce ai vrea să fie ajustat…" style={{ width: "100%", boxSizing: "border-box", margin: "10px 0", padding: 14, borderRadius: 14, background: "rgba(5,5,15,.65)", color: "#f8fafc", border: "1px solid rgba(167,139,250,.35)", font: "15px/1.6 Georgia,serif" }} />
                  <button disabled={busy || !adjustment.trim()} onClick={() => act({ action: "adjust", adjustment })} style={{ ...button, opacity: busy || !adjustment.trim() ? .5 : 1 }}>{busy ? "Se ajustează…" : "Generează interpretarea ajustată"}</button>
                </div>}
              </>}
            </div>}
          </section>
        </>}
        {error && <p role="alert" style={{ color: "#fca5a5", marginTop: 18 }}>{error}</p>}
        <a href="/" style={{ display: "inline-block", color: "#a78bfa", marginTop: 28 }}>← Înapoi la EWA AI</a>
      </div>
    </main>
  );
}
