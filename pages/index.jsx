import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Esti NOVA - asistenta AI de marketing digital pentru antreprenori din Romania.

NISA TINTA: Antreprenoare digitale, creatoare de continut, femei ambitioase care vor sa creasca pe Instagram si TikTok si sa vanda produse digitale.

PRODUSELE DISPONIBILE:
1. ACADEMIA AI - 127 euro (valoare 667 euro) - Singurul program din Romania care te invata sa transformi AI-ul in rezultate reale. Creezi Avatar AI realist, faci video-uri, construiesti brand faceless. 90+ lectii video, program afiliere 80% comision.
2. ELITE DIGITAL COURSE - 299 euro - Curs audio-video complet in 7 limbi. Include bonusuri MRR de 700 euro pe care le vinzi cu 100% profit.
3. PACHET BUSINESS PREMIUM - 70 euro - 30 ghiduri digitale MRR, le vinzi cu 100% profit. Grup WhatsApp suport inclus.
4. PACHET MASTER GOLD - 105 euro - 40 ghiduri + 6.000 videoclipuri faceless + tutoriale video.
5. BUSINESS START ALL-IN-ONE - 130 euro - 35 ghiduri + 20.000 video + idei continut strategic.
6. DEBLOCAREA VANZARILOR - 27 euro - Cursul care a schimbat rezultatele la 300+ femei. Plan continut, DM-uri Magnetice, workbook-uri. Bonusuri: 50+ idei Reels, 170 idei Story-uri, 100 CTA-uri, 200 Hook-uri. Program afiliere 60% comision.
7. MINDFUL MESSAGING - 68 USD - Vinzi natural prin DM-uri. 14 module, scripturi DM, Cooper the Closer AI. Program afiliere 70% comision.

REGULI PRODUSE:
- Buget mic → recomanda Deblocarea Vanzarilor 27 euro
- Vrea AI si avatare → recomanda Academia AI 127 euro (80% comision!)
- Vrea pachet complet → recomanda Elite Digital Course 299 euro (bonusuri MRR 700 euro)
- Mentionezi mereu programele de afiliere

TERMENI (cand cineva intreaba):
Produsul este pentru uz personal sau propriul business. Interzisa revanzarea fara acord scris. Vanzarile sunt finale. Autorul nu garanteaza rezultate. EWA. Toate drepturile rezervate.

EXPERTIZA:
- Hook-uri virale pentru Reels si carusele Instagram/TikTok
- CTA-uri persuasive care convertesc
- Scenarii complete pentru Reels (30s/45s/60s/90s)
- Structuri carusele care educa si vand
- Strategii crestere organica Instagram
- Vanzare prin continut fara a parea insistent
- Marketing cu avatare AI si continut faceless

STILUL TAU:
- Raspunzi MEREU in romana
- Esti directa, energica, calda si motivanta
- Cand cineva cere continut → intrebi INTAI tonul: Ce ton preferi? Profesional / Prietenos / Empatic / Motivational / Amuzant
- Dupa ce alege tonul → generezi imediat
- Daca specifica deja tonul → generezi direct fara sa mai intrebi

REGULI STRICTE CONTINUT GENERAT:
INTERZIS: promisiuni venit rapid/garantat, cuvinte sensibile (bani, castig, profit, venit, euro, dollar, imbogatire, libertate financiara, venit pasiv), cifre exacte de venit.
INLOCUIESTE CU: rezultate, impact, valoare, succes, crestere, sistem care lucreaza pentru tine, libertate, flexibilitate, timp pentru familie, implinire.`;

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#a78bfa",
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i*0.2}s`
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14, gap: 10, alignItems: "flex-end"
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, overflow: "hidden"
        }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="NOVA" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}} /></div>
      )}
      <div style={{
        maxWidth: "75%", padding: "12px 16px",
        borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        background: isUser ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.06)",
        color: "#f8fafc", fontSize: 14, lineHeight: 1.65,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        border: isUser ? "none" : "1px solid rgba(167,139,250,0.2)"
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0
        }}>👤</div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Salut! Sunt NOVA - asistenta ta AI de marketing digital.\n\nNu complic. Simplific. Sunt aici sa iti amintesc: nu esti in urma - esti exact la timp.\n\nIata cum ma poti folosi:\n\nHOOK-URI VIRALE\n- 5 hook-uri stop scrolling pentru [subiect]\n- Hook-uri cu ton empatic pentru nisa [nisa ta]\n\nSCENARII REELS\n- Scenariu reel cu hook, pain point, solutie si CTA pentru [subiect]\n- Reel 30s tip storytelling pentru [nisa ta]\n\nSTRUCTURI CARUSELE\n- Carusel de 7 slide-uri despre [subiect]\n\nCTA-URI\n- 5 CTA-uri de engagement pentru Instagram\n- CTA-uri de vanzare care nu suna pushy\n\nCAPTIONS\n- Caption storytelling pentru un reel despre [subiect]\n\nSpecifica nisa ta si tonul dorit pentru continut personalizat!\n\nDISCLAIMER: Continutul generat este doar pentru uz personal. Redistribuirea accesului este interzisa. Rezultatele depind de aplicarea strategiilor.\n\nCu ce incepem azi?"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const newMsgs = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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",
          "HTTP-Referer": "https://nova-chatbot-ten.vercel.app",
          "X-Title": "NOVA Marketing AI"
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-5-haiku",
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newMsgs.map(m => ({ role: m.role, content: m.content }))
          ]
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Eroare. Incearca din nou.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Eroare de conexiune. Incearca din nou." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top left, #1e0a3c 0%, #0d0d1a 40%, #0a0a0f 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "Georgia, serif"
    }}>
      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(167,139,250,0.2)}50%{box-shadow:0 0 60px rgba(219,39,119,0.3)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:2px}
        textarea{resize:none;font-family:inherit;outline:none}
      `}</style>

      <div style={{
        width: "100%", maxWidth: 580,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 28,
        border: "1px solid rgba(167,139,250,0.2)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
        overflow: "hidden",
        animation: "glow 5s ease-in-out infinite"
      }}>
        <div style={{
          padding: "18px 22px",
          background: "linear-gradient(135deg, rgba(109,40,217,0.15), rgba(219,39,119,0.1))",
          borderBottom: "1px solid rgba(167,139,250,0.15)",
          display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 0 20px rgba(124,58,237,0.5)", overflow: "hidden"
          }}><img src="https://i.imgur.com/UUrViWA.jpeg" alt="NOVA" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}} /></div>
          <div>
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 17 }}>NOVA AI</div>
            <div style={{ color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
              Expert Marketing Digital
            </div>
          </div>
        </div>

        <div style={{ height: 450, overflowY: "auto", padding: "16px 16px 8px" }}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
              }}>🔮</div>
              <div style={{
                background: "rgba(255,255,255,0.06)", borderRadius: "20px 20px 20px 4px",
                border: "1px solid rgba(167,139,250,0.2)"
              }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "10px 16px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "rgba(255,255,255,0.05)", borderRadius: 18,
            border: "1px solid rgba(167,139,250,0.25)", padding: "10px 14px"
          }}>
            <textarea
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Cere hook-uri, CTA-uri, scenarii..."
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#f1f5f9", fontSize: 14, lineHeight: 1.6,
                maxHeight: 100, overflowY: "auto"
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
                background: input.trim() && !loading ? "linear-gradient(135deg, #6d28d9, #db2777)" : "rgba(255,255,255,0.08)",
                color: input.trim() && !loading ? "#fff" : "#475569",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}
