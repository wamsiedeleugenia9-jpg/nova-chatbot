# EWA AI

Asistenta AI de marketing digital pentru antreprenori din Romania. Construita cu Next.js si publicata pe Vercel.

## Stack

- **Frontend:** Next.js (Pages Router), React
- **AI:** Anthropic API (`claude-sonnet-4-6`), apelat exclusiv server-side din `pages/api/chat.js`
- **Autentificare:** Supabase Auth; clientul gestioneaza inregistrarea, autentificarea, recuperarea parolei si sesiunea utilizatorului
- **Date:** Supabase, cu acces protejat prin Row Level Security (RLS)

## Variabile de mediu

| variabila | scop |
|---|---|
| `ANTHROPIC_API_KEY` | cheia Anthropic, folosita doar server-side. **Niciodata cu prefix `NEXT_PUBLIC_`.** |
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul proiectului Supabase, folosit de client si API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cheia anon Supabase; accesul la date este protejat prin RLS |

## Autentificare

Supabase Auth este arhitectura curenta de autentificare. Sesiunea Supabase protejeaza atat interfata de chat, cat si ruta `/blueprint`, iar operatiile Creator Blueprint sunt asociate utilizatorului autentificat.

## Creator Blueprint

Creator Blueprint Phase 3 contine Atelierele 1–7. Atelierul 8 / Creator DNA apartine de Phase 4 si nu este implementat inca.

Ruta protejata `/blueprint` foloseste tabelele aprobate `creator_blueprints`, `blueprint_sections` si `blueprint_answers`. Raspunsurile nu sunt salvate automat; fiecare raspuns este salvat atunci cand utilizatorul il trimite.

Inainte de utilizare, aplicati ambele migratii Blueprint, in aceasta ordine:

1. `supabase/migrations/20260730000000_extend_blueprint_answers_vertical_slice.sql`
2. `supabase/migrations/20260802000000_extend_blueprint_sections_phase_3.sql`

Continutul Creator Blueprint este pastrat in `content/creator-blueprint.json`.

## Structura proiectului

```text
content/
└── creator-blueprint.json       continutul Atelierelor 1–7
lib/
├── blueprint/state.js           derivarea starii Creator Blueprint
├── prompts/creatorBlueprint.js  prompturile pentru Blueprint
├── server/supabase.js           clientul Supabase pentru API
└── supabaseClient.js            clientul Supabase pentru browser
pages/
├── api/
│   ├── blueprint.js             API-ul Creator Blueprint
│   └── chat.js                  API-ul server-side pentru Anthropic
├── blueprint.jsx                interfata Creator Blueprint
└── index.jsx                    autentificarea si interfata de chat
supabase/migrations/
├── 20260730000000_extend_blueprint_answers_vertical_slice.sql
└── 20260802000000_extend_blueprint_sections_phase_3.sql
```

## Status

Branch-ul `upgrade/ewa-v2` contine upgrade-ul in desfasurare catre arhitectura EWA MVP completa. Creator Blueprint Phase 3 este limitat la Atelierele 1–7; Creator DNA, Dashboard-ul si abonamentul Stripe sunt etape ulterioare.
