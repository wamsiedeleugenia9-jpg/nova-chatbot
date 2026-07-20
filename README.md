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

## Structura
pages/
├── index.jsx interfata de chat + gate de acces
└── api/
├── chat.js ruta server-side care apeleaza Anthropic
└── verify-token.js verificare cod de acces (temporar)
## Status

Acest repo este in curs de upgrade catre arhitectura EWA MVP completa (Creator Blueprint, Creator DNA, Dashboard, Supabase Auth, abonament Stripe). Vezi branch-ul `upgrade/ewa-v2` pentru lucrul in desfasurare.
