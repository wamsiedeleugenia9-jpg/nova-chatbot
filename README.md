# EWA AI

Asistenta AI de marketing digital pentru antreprenori din Romania. Construita cu Next.js, deployed pe Vercel.

## Stack

- **Frontend:** Next.js (Pages Router), React
- **AI:** Anthropic API (`claude-sonnet-4-6`), apelat exclusiv server-side din `pages/api/chat.js`
- **Acces (temporar, doar testare interna):** coduri statice via `ACCESS_TOKENS`, verificate in `pages/api/verify-token.js`

## Variabile de mediu

| variabila | scop |
|---|---|
| `ANTHROPIC_API_KEY` | cheia Anthropic, folosita doar server-side. **Niciodata cu prefix `NEXT_PUBLIC_`.** |
| `ACCESS_TOKENS` | lista de coduri de acces valide, separate prin virgula (mecanism temporar de testare interna) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul proiectului Supabase, folosit de client si API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cheia anon Supabase; accesul la date este protejat prin RLS |

## Creator Blueprint (vertical slice 1)

Ruta protejata `/blueprint` foloseste tabelele aprobate `creator_blueprints`,
`blueprint_sections` si `blueprint_answers`. Aplicati migratia
`supabase/migrations/20260730000000_extend_blueprint_answers_vertical_slice.sql` inainte de
utilizare. Continutul temporar este izolat in `content/creator-blueprint.json` si trebuie
inlocuit cu formularea exacta din documentul EWA MVP inainte de aprobarea pentru productie.

## Structura
pages/
├── index.jsx interfata de chat + gate de acces
└── api/
├── chat.js ruta server-side care apeleaza Anthropic
└── verify-token.js verificare cod de acces (temporar)
## Status

Acest repo este in curs de upgrade catre arhitectura EWA MVP completa (Creator Blueprint, Creator DNA, Dashboard, Supabase Auth, abonament Stripe). Vezi branch-ul `upgrade/ewa-v2` pentru lucrul in desfasurare.
