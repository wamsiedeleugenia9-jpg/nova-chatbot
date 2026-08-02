import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const shell = { minHeight: "100vh", background: "radial-gradient(ellipse at top left,#1e0a3c 0%,#0d0d1a 45%,#0a0a0f 100%)", color: "#f8fafc", padding: "32px 16px", fontFamily: "Georgia,serif" };
const card = { maxWidth: 760, margin: "0 auto", padding: "clamp(24px,6vw,48px)", borderRadius: 28, background: "rgba(255,255,255,.04)", border: "1px solid rgba(167,139,250,.22)", boxShadow: "0 30px 80px rgba(0,0,0,.55)" };
const button = { border: 0, borderRadius: 14, padding: "13px 20px", color: "white", background: "linear-gradient(135deg,#6d28d9,#db2777)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 15 };
const textarea = { width: "100%", boxSizing: "border-box", margin: "14px 0", padding: 16, borderRadius: 14, background: "rgba(5,5,15,.65)", color: "#f8fafc", border: "1px solid rgba(167,139,250,.35)", font: "15px/1.6 Georgia,serif", resize: "vertical" };
const adjustmentOptions = ["Prea formal", "Prea vânzător", "Prea rece", "Prea lung", "Prea generic", "Sună forțat", "Nu folosește cuvintele mele"];

export default function Blueprint() {
  const [session, setSession] = useState(undefined);
  const [content, setContent] = useState(null);
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const adjustmentField = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (session) load(session); }, [session]);

  async function request(currentSession, method, body) {
    const response = await fetch("/api/blueprint", { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentSession.access_token}` }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "A apărut o eroare.");
    return data;
  }
  function update(data) {
    setContent(data.content); setState(data.state); setAnswer(""); setAdjustment(""); setShowAdjustment(false); setError("");
  }
  async function load(currentSession) {
    setLoading(true); setError("");
    try { update(await request(currentSession, "GET")); } catch (err) { setError(err.message || "A apărut o eroare."); }
    finally { setLoading(false); }
  }
  async function act(body) {
    setBusy(true); setError("");
    try { update(await request(session, "POST", body)); } catch (err) { setError(err.message || "A apărut o eroare."); }
    finally { setBusy(false); }
  }
  function chooseAdjustment(option) {
    setAdjustment(current => current.trim() ? current : option);
  }
  function submitAdjustment(atelierNumber) {
    // Read from the field at submission time so appended free-form feedback is
    // included together with the selected preset, even before another render.
    const completeFeedback = adjustmentField.current?.value ?? adjustment;
    return act({ action: "adjust", atelierNumber, adjustment: completeFeedback });
  }

  if (session === undefined || (session && loading)) return <main style={shell}><div style={card}>Se încarcă…</div></main>;
  if (!session) return <main style={shell}><div style={{ ...card, textAlign: "center" }}><h1>Creator Blueprint</h1><p style={{ color: "#c4b5fd" }}>Autentifică-te pentru a începe sau a continua Blueprint-ul.</p><a href="/" style={{ ...button, display: "inline-block", textDecoration: "none" }}>Mergi la autentificare</a></div></main>;
  if (!content) return <main style={shell}><div style={{ ...card, textAlign: "center" }}><h1>Creator Blueprint</h1><p role="alert" style={{ color: "#fca5a5", lineHeight: 1.7 }}>{error}</p><button onClick={() => load(session)} style={button}>Încearcă din nou</button><br /><a href="/" style={{ display: "inline-block", color: "#a78bfa", marginTop: 28 }}>← Înapoi la EWA AI</a></div></main>;

  const atelier = content.ateliers.find(item => item.number === state.currentAtelier);
  const question = atelier?.questions.find(item => item.number === state.currentQuestion);
  const progress = Math.round(((state.currentAtelier - 1) / content.ateliers.length) * 100);
  return <main style={shell}><div style={card}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#a78bfa", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" }}><span>EWA · Creator Blueprint</span><span>{state.completed ? "Finalizat" : `Atelier ${state.currentAtelier} din 7`}</span></div>
    <div aria-label={`Progres ${progress}%`} style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 5, marginTop: 14 }}><div style={{ width: `${state.completed ? 100 : progress}%`, height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#7c3aed,#ec4899)" }} /></div>
    {!state.started ? <><h1 style={{ fontSize: "clamp(34px,7vw,52px)" }}>{content.title}</h1><p style={{ color: "#ddd6fe", lineHeight: 1.8 }}>{content.introduction}</p><button disabled={busy} onClick={() => act({ action: "start" })} style={button}>{busy ? "Se pregătește…" : "Începe Blueprint-ul"}</button></>
      : state.completed ? <section style={{ textAlign: "center", padding: "48px 0" }}><h1>Creator Blueprint este complet</h1><p style={{ color: "#c4b5fd", lineHeight: 1.8 }}>Ai confirmat toate cele șapte ateliere. Răspunsurile și sintezele tale sunt salvate.</p></section>
      : <><header style={{ marginTop: 30 }}><h1 style={{ fontSize: 32, marginBottom: 8 }}>{atelier.title}</h1><p style={{ color: "#c4b5fd", lineHeight: 1.75 }}>{atelier.introduction}</p></header>
        {question ? <section style={{ marginTop: 28, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)", border: "1px solid rgba(167,139,250,.2)" }}>
          <div style={{ color: "#f0abfc", fontSize: 13 }}>ÎNTREBAREA {question.number} DIN {atelier.questions.length}</div><h2 style={{ fontSize: 22, lineHeight: 1.45 }}>{question.text}</h2>
          <textarea aria-label="Răspunsul tău" value={answer} onChange={event => setAnswer(event.target.value)} disabled={busy} rows={8} maxLength={8000} placeholder="Scrie răspunsul tău aici…" style={textarea} />
          <button disabled={busy || !answer.trim()} onClick={() => act({ action: "submit", atelierNumber: atelier.number, questionNumber: question.number, answer })} style={{ ...button, opacity: busy || !answer.trim() ? .5 : 1 }}>{busy ? (question.number === atelier.questions.length ? "EWA creează sinteza…" : "Se salvează…") : "Salvează și continuă"}</button>
        </section> : <section style={{ marginTop: 28, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)", border: "1px solid rgba(167,139,250,.2)" }}>
          {state.needsSummary ? <><h2>Sinteza nu a fost generată</h2><p style={{ color: "#c4b5fd", lineHeight: 1.7 }}>Răspunsurile tale sunt în siguranță. Poți încerca din nou doar generarea sintezei.</p><button disabled={busy} onClick={() => act({ action: "generate_summary", atelierNumber: atelier.number })} style={button}>{busy ? "EWA creează sinteza…" : "Generează din nou sinteza"}</button></>
            : <><div style={{ color: "#a78bfa", fontSize: 13 }}>SINTEZA ATELIERULUI</div><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 17 }}>{state.summary}</div>
              {!showAdjustment ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}><button disabled={busy} onClick={() => act({ action: "confirm", atelierNumber: atelier.number })} style={button}>Da, mă reprezintă</button><button disabled={busy} onClick={() => setShowAdjustment(true)} style={{ ...button, background: "transparent", border: "1px solid #a78bfa" }}>Vreau o ajustare</button></div>
                : <div><p style={{ color: "#c4b5fd", marginBottom: 8 }}>Ce nu sună ca tine?</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{adjustmentOptions.map(option => <button key={option} type="button" disabled={busy} onClick={() => chooseAdjustment(option)} style={{ ...button, padding: "8px 12px", background: "rgba(167,139,250,.12)", border: "1px solid rgba(167,139,250,.45)", fontSize: 13 }}>{option}</button>)}</div><textarea ref={adjustmentField} aria-label="Ajustarea dorită" value={adjustment} onChange={event => setAdjustment(event.target.value)} rows={4} maxLength={2000} placeholder="Spune ce ai vrea să fie ajustat…" style={textarea} /><button disabled={busy || !adjustment.trim()} onClick={() => submitAdjustment(atelier.number)} style={{ ...button, opacity: busy || !adjustment.trim() ? .5 : 1 }}>{busy ? "Se ajustează…" : "Regenerează sinteza"}</button></div>}
            </>}
        </section>}</>}
    {error && <p role="alert" style={{ color: "#fca5a5", marginTop: 18 }}>{error}</p>}
    <a href="/" style={{ display: "inline-block", color: "#a78bfa", marginTop: 28 }}>← Salvează și revino la EWA AI</a>
  </div></main>;
}
