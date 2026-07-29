# EWA AI

Asistenta AI de marketing digital pentru antreprenori din Romania. Construita cu Next.js, deployed pe Vercel.

## Stack

- **Frontend:** Next.js (Pages Router), React
- **AI:** Anthropic API (`claude-sonnet-4-6`), apelat exclusiv server-side din `pages/api/chat.js`
- **Autentificare:** accesul la chat este protejat exclusiv prin Supabase Auth; fiecare apel este verificat server-side

## Variabile de mediu

| variabila | scop |
|---|---|
| `ANTHROPIC_API_KEY` | cheia Anthropic, folosita doar server-side. **Niciodata cu prefix `NEXT_PUBLIC_`.** |
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul proiectului Supabase, folosit de clientul din browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cheia anon/publishable Supabase, folosita de clientul din browser |
| `SUPABASE_URL` | URL-ul proiectului Supabase, folosit server-side pentru verificarea tokenurilor |
| `SUPABASE_ANON_KEY` | cheia anon/publishable Supabase, folosita server-side. **Nu folosi cheia `service_role`.** |

Toate cele cinci variabile trebuie configurate in Vercel pentru mediile in care ruleaza aplicatia. Nu adauga valori reale in repository. Cheile `ANTHROPIC_API_KEY` si orice cheie `service_role` nu trebuie sa aiba niciodata prefixul `NEXT_PUBLIC_`.

## Structura

```text
.
├── lib/
│   ├── supabaseClient.js  client Supabase pentru browser
│   └── supabaseServer.js  client Supabase pentru verificarea tokenurilor
└── pages/
    ├── api/
    │   └── chat.js        autentificare server-side + apel Anthropic
    └── index.jsx          interfata de chat + autentificare
```

## Status

Phase 1 securizeaza exclusiv chat-ul existent cu Supabase Auth. Functionalitati din fazele ulterioare nu sunt incluse.
