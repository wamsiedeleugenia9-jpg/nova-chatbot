import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const shell = { minHeight: "100vh", background: "radial-gradient(ellipse at top left,#1e0a3c,#0a0a0f 65%)", color: "#f8fafc", padding: "32px 16px", fontFamily: "Georgia,serif" };
const card = { maxWidth: 760, margin: "0 auto", padding: "clamp(24px,6vw,48px)", borderRadius: 28, background: "rgba(255,255,255,.04)", border: "1px solid rgba(167,139,250,.22)" };
const button = { border: 0, borderRadius: 14, padding: "13px 20px", color: "white", background: "linear-gradient(135deg,#6d28d9,#db2777)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 };
const secondary = { ...button, background: "transparent", border: "1px solid #a78bfa" };
const dnaSections = [
  ["creator_identity", "Cine ești"], ["audience", "Pentru cine creezi"], ["transformation", "Transformarea pe care o oferi"],
  ["offer", "Prima ta ofertă"], ["voice", "Vocea ta"], ["content_system", "Sistemul tău de conținut"],
  ["business_goal", "Obiectivul tău pe 90 de zile"], ["why", "De ce faci asta"]
];
const workshopLabels = ["Cine ești", "Pentru cine creezi", "Transformarea", "Oferta", "Vocea", "Conținutul", "Business", "Creator DNA / De ce faci asta"];

function creatorDnaText(sections) {
  return dnaSections.map(([key, title], index) => `${index + 1}. ${title}\n\n${sections[key]}`).join("\n\n");
}

export default function Blueprint() {
  const [session, setSession] = useState(); const [data, setData] = useState();
  const [answer, setAnswer] = useState(""); const [adjustment, setAdjustment] = useState("");
  const [editAnswers, setEditAnswers] = useState([]); const [showWorkshops, setShowWorkshops] = useState(false); const [confirmReset, setConfirmReset] = useState(false);
  const [adjusting, setAdjusting] = useState(false); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let active = true; supabase.auth.getSession().then(({ data: auth }) => active && setSession(auth.session)); const { data: listener } = supabase.auth.onAuthStateChange((_e, next) => setSession(next)); return () => { active = false; listener.subscription.unsubscribe(); }; }, []);
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => { if (data?.state?.editingAnswers) setEditAnswers(data.state.answers.map(item => item.rawAnswer)); }, [data?.state?.currentAtelier, data?.state?.editingAnswers]);
  function showError(err) { setError(err.message || "A apărut o eroare."); }
  async function load() { setLoading(true); setError(""); try { setData(await request("GET")); } catch (err) { showError(err); } finally { setLoading(false); } }
  async function request(method, body) { const response = await fetch("/api/blueprint", { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: body && JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; }
  async function act(body) { setBusy(true); setError(""); try { const next = await request("POST", body); setData(next); setAnswer(""); setAdjustment(""); setAdjusting(false); } catch (err) { showError(err); } finally { setBusy(false); } }
  async function openWorkshop(atelierNumber) { setBusy(true); setError(""); try { const next = await request("POST", { action: "edit_workshop", atelierNumber }); setData(next); setEditAnswers(next.state.answers.map(item => item.rawAnswer)); setShowWorkshops(false); } catch (err) { showError(err); } finally { setBusy(false); } }
  async function saveEdit() { await act({ action: "save_edit", answers: editAnswers.map((value, index) => ({ questionNumber: index + 1, answer: value })) }); }
  async function copyDna() { try { await navigator.clipboard.writeText(creatorDnaText(data.creatorDna)); } catch (err) { showError(err); } }
  function downloadDna() { const url = URL.createObjectURL(new Blob([creatorDnaText(data.creatorDna)], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "creator-dna.txt"; link.click(); URL.revokeObjectURL(url); }
  if (session === undefined || (session && loading)) return <main style={shell}><div style={card}>Se încarcă…</div></main>;
  if (!session) return <main style={shell}><div style={{ ...card, textAlign: "center" }}><h1>Creator Blueprint</h1><p>Autentifică-te pentru a începe sau a continua.</p><a href="/" style={{ ...button, display: "inline-block", textDecoration: "none" }}>Mergi la autentificare</a></div></main>;
  if (!data) return <main style={shell}><div style={{ ...card, textAlign: "center" }}><h1>Creator Blueprint</h1><p role="alert" style={{ color: "#fca5a5" }}>{error || "Nu am putut încărca progresul."}</p><button onClick={load} style={button}>Încearcă din nou</button><br /><a href="/" style={{ display: "inline-block", color: "#a78bfa", marginTop: 28 }}>← Înapoi la EWA AI</a></div></main>;
  const { content, state } = data; const atelier = content.ateliers[state.currentAtelier - 1];
  const questionNumber = Math.min(state.currentQuestion, atelier.questions.length); const allAnswered = state.answers.filter(item => item.rawAnswer).length === atelier.questions.length;
  return <main style={shell}><div style={card}>
    <div style={{ color: "#a78bfa", letterSpacing: 1.5, fontSize: 13 }}>EWA · CREATOR BLUEPRINT</div>
    {data.creatorDna && !state.editing ? <><h1 style={{ fontSize: 42 }}>Creator DNA</h1><p style={{ color: "#6ee7b7" }}>✓ Creator Blueprint finalizat</p>
      {dnaSections.map(([key, title], index) => <section key={key} style={{ marginTop: 24 }}><div style={{ color: "#f0abfc", fontSize: 13 }}>SECȚIUNEA {index + 1}</div><h2>{title}</h2><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{data.creatorDna[key]}</div></section>)}
      <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}><a href="/" style={{ ...button, display: "inline-block", textDecoration: "none" }}>Înapoi la EWA</a><button onClick={copyDna} style={button}>Copy text</button><button onClick={downloadDna} style={secondary}>Download</button><button onClick={() => setShowWorkshops(value => !value)} style={secondary}>Editează Creator Blueprint</button></div>
      {showWorkshops && <section style={{ marginTop: 24, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)" }}><h2>Alege atelierul pe care vrei să îl editezi</h2><div style={{ display: "grid", gap: 10 }}>{workshopLabels.map((label, index) => <button disabled={busy} key={label} onClick={() => openWorkshop(index + 1)} style={{ ...secondary, textAlign: "left" }}>{index + 1}. {label}</button>)}</div></section>}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(167,139,250,.22)" }}><button onClick={() => setConfirmReset(true)} style={{ ...secondary, borderColor: "rgba(248,113,113,.65)", color: "#fca5a5" }}>Refă Creator Blueprint de la început</button></div>
      {confirmReset && <section role="alertdialog" aria-label="Confirmare resetare" style={{ marginTop: 24, padding: 24, borderRadius: 20, border: "1px solid #f87171" }}><h2>Începi un Creator Blueprint nou?</h2><p>Răspunsurile, rezumatele și Creator DNA existente vor fi șterse numai dacă confirmi. Această acțiune nu poate fi anulată.</p><div style={{ display: "flex", gap: 10 }}><button disabled={busy} onClick={() => act({ action: "reset", confirm: true })} style={button}>Da, încep de la început</button><button onClick={() => setConfirmReset(false)} style={secondary}>Păstrează Blueprint-ul</button></div></section>}
    </> : !state.started ? <><h1 style={{ fontSize: 48 }}>{content.title}</h1><p style={{ color: "#ddd6fe", lineHeight: 1.8 }}>{content.introduction}</p><button disabled={busy} onClick={() => act({ action: "start" })} style={button}>Încep Creator Blueprint</button></> : <>
      <div style={{ marginTop: 24, color: "#c4b5fd" }}>Atelierul {atelier.number} din 8 · {Math.round(((atelier.number - 1) / 8) * 100)}% parcurs</div>
      <h1 style={{ fontSize: 36 }}>Atelierul {atelier.number} — {atelier.title}</h1>
      {state.editing && <><p style={{ color: "#6ee7b7" }}>Editezi doar acest atelier. Celelalte ateliere rămân neschimbate.</p>
        {data.saved && <p role="status" style={{ color: "#6ee7b7" }}>✓ Răspunsurile, rezumatul și Creator DNA au fost salvate. Confirmă rezumatul de mai jos.</p>}
        {state.editingAnswers && <section style={{ marginTop: 24, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)", border: "1px solid rgba(167,139,250,.2)" }}>
          {atelier.questions.map((question, index) => <label key={question} style={{ display: "block", marginBottom: 22, lineHeight: 1.5 }}><strong>{index + 1}. {question}</strong><textarea aria-label={`Răspuns atelier ${atelier.number}, întrebarea ${index + 1}`} value={editAnswers[index] || ""} onChange={event => setEditAnswers(values => { const next = [...values]; next[index] = event.target.value; return next; })} rows={5} maxLength={8000} style={{ width: "100%", boxSizing: "border-box", padding: 16, marginTop: 10, borderRadius: 14, background: "#090716", color: "white", border: "1px solid #6d4ca4", font: "15px/1.6 Georgia" }} /></label>)}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button disabled={busy || editAnswers.length !== atelier.questions.length || editAnswers.some(value => !value?.trim())} onClick={saveEdit} style={button}>{busy ? "EWA regenerează rezumatul…" : "Salvează și regenerează rezumatul"}</button><button disabled={busy} onClick={() => act({ action: "cancel_edit" })} style={secondary}>Anulează editarea</button></div>
        </section>}
      </>}
      {!state.answers.length && !state.summary && <p style={{ lineHeight: 1.8, color: "#ddd6fe" }}>{atelier.introduction}</p>}
      {!state.editing && !allAnswered && <section style={{ marginTop: 24, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)", border: "1px solid rgba(167,139,250,.2)" }}>
        <div style={{ color: "#f0abfc", fontSize: 13 }}>ÎNTREBAREA {questionNumber} DIN {atelier.questions.length}</div><h2 style={{ lineHeight: 1.45 }}>{atelier.questions[questionNumber - 1]}</h2>
        <textarea aria-label="Răspunsul tău" value={answer} onChange={event => setAnswer(event.target.value)} rows={7} maxLength={8000} placeholder="Scrie răspunsul tău aici…" style={{ width: "100%", boxSizing: "border-box", padding: 16, margin: "12px 0", borderRadius: 14, background: "#090716", color: "white", border: "1px solid #6d4ca4", font: "15px/1.6 Georgia" }} />
        <button disabled={busy || !answer.trim()} onClick={() => act({ action: "submit", questionNumber, answer })} style={{ ...button, opacity: busy || !answer.trim() ? .5 : 1 }}>{busy ? "EWA ascultă…" : "Continuă"}</button>
      </section>}
      {!state.editing && allAnswered && !state.summary && <section style={{ marginTop: 24, padding: 24, borderRadius: 20, background: "rgba(109,40,217,.12)", border: "1px solid rgba(167,139,250,.2)" }}><p>Răspunsurile sunt salvate. Rezumatul atelierului nu a putut fi generat încă.</p><button disabled={busy} onClick={() => act({ action: "summarize" })} style={button}>{busy ? "EWA construiește rezumatul…" : "Încearcă din nou rezumatul"}</button></section>}
      {state.summary && <section style={{ marginTop: 24, padding: 24, borderRadius: 20, background: "rgba(219,39,119,.08)", border: "1px solid rgba(244,114,182,.25)" }}><p style={{ color: "#f0abfc" }}>{atelier.summaryLead}</p><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 18 }}>{state.summary}</div><p style={{ color: "#c4b5fd", lineHeight: 1.6 }}>{content.validation}</p>
        {!state.completed && !state.editingAnswers && !adjusting && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button disabled={busy} onClick={() => act({ action: "confirm" })} style={button}>{state.editing ? "Confirmă și regenerează Creator DNA" : "Confirm, continuăm"}</button>{atelier.number < 8 && <button onClick={() => setAdjusting(true)} style={secondary}>Ajustăm ceva</button>}{!state.editing && <button disabled={busy} onClick={() => act({ action: "pause" })} style={secondary}>Pauză, revin mai tâziu</button>}</div>}
        {adjusting && <div><p>Ce nu sună ca tine?</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{content.adjustmentOptions.map(option => <button key={option} onClick={() => setAdjustment(option)} style={{ ...secondary, padding: "9px 12px", background: adjustment === option ? "#6d28d9" : "transparent" }}>{option}</button>)}</div><textarea aria-label="Detalii ajustare" value={adjustment} onChange={event => setAdjustment(event.target.value)} rows={3} style={{ width: "100%", boxSizing: "border-box", padding: 12, margin: "12px 0", borderRadius: 12, background: "#090716", color: "white" }} /><button disabled={busy || !adjustment.trim()} onClick={() => act({ action: "adjust", adjustment })} style={button}>Regenerează rezumatul</button></div>}
        {state.completed && <div><p style={{ color: "#6ee7b7" }}>✓ Atelier confirmat și salvat.</p><p style={{ lineHeight: 1.7 }}>{atelier.next}</p>{atelier.number < 8 ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button disabled={busy} onClick={() => act({ action: "continue" })} style={button}>Continuăm acum</button><button disabled={busy} onClick={() => act({ action: "pause" })} style={secondary}>Pauză, revin mai târziu</button></div> : <button disabled={busy} onClick={() => act({ action: "generate_dna" })} style={button}>{busy ? "EWA construiește Creator DNA…" : "Generează Creator DNA"}</button>}</div>}
      </section>}
    </>}
    {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
  </div></main>;
}

export { creatorDnaText, dnaSections };
