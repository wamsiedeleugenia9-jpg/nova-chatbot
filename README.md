# EWA AI

Asistenta AI de marketing digital pentru antreprenori din Romania. Construita cu Next.js si publicata pe Vercel.

## Stack

- **Frontend:** Next.js (Pages Router), React
- **AI:** Anthropic API (`claude-sonnet-4-6`), apelat exclusiv server-side
- **Autentificare:** Supabase Auth; sesiunea utilizatorului este verificata pentru rutele protejate
- **Date:** Supabase, cu acces protejat prin Row Level Security (RLS)

## Variabile de mediu

| variabila | scop |
|---|---|
| `ANTHROPIC_API_KEY` | cheia Anthropic, folosita doar server-side. Niciodata cu prefix `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul proiectului Supabase, folosit de client si de Creator Blueprint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cheia anon/publishable Supabase folosita de client si de Creator Blueprint |
| `SUPABASE_URL` | URL-ul proiectului Supabase folosit server-side |
| `SUPABASE_ANON_KEY` | cheia anon/publishable Supabase folosita server-side. Nu folosi cheia `service_role`. |

Nu adauga valori reale ale cheilor in repository.

## Autentificare

Supabase Auth este arhitectura curenta de autentificare.

Sesiunea utilizatorului protejeaza functionalitatile asociate contului, iar datele Creator Blueprint sunt asociate utilizatorului autentificat.

### Acces owner/admin

Rolurile privilegiate sunt pastrate in `public.user_roles`, nu in date trimise de
browser sau in metadata modificabila de utilizator. Aplicati migrarea
`supabase/migrations/20260825010000_create_user_roles.sql`, apoi identificati
contul owner in **Supabase Dashboard > Authentication > Users**. Din SQL Editor,
inlocuiti parametrul de mai jos cu UUID-ul copiat din Dashboard si executati o
singura data:

```sql
insert into public.user_roles (user_id, role)
values ('OWNER_AUTH_USER_UUID'::uuid, 'admin')
on conflict (user_id) do update set role = excluded.role;
```

Nu rulati aceasta instructiune din browser si nu folositi cheia `service_role` in
aplicatie. Utilizatorii fara rand sau cu rolul `user` raman utilizatori normali.
Helper-ele server-side din `lib/server/access.js` citesc rolul prin sesiunea
Supabase verificata. `authorizeFeature` acorda adminului acces direct, fara a
apela verificarea de abonament; pentru ceilalti utilizatori apeleaza evaluatorul
de entitlements primit. Orice viitor gate de plan/Stripe trebuie sa foloseasca
acest helper, iar rutele exclusiv administrative pot folosi `requireAdmin`.

## Creator Blueprint

Creator Blueprint Phase 3 contine Atelierele 1–7.

Atelierul 8 si generarea Creator DNA sunt implementate.

Ruta protejata `/blueprint` foloseste tabelele:

- `creator_blueprints`
- `blueprint_sections`
- `blueprint_answers`

Fiecare raspuns este salvat atunci cand utilizatorul il trimite. Textul aflat in curs de redactare nu este salvat automat.

Progresul salvat poate fi reluat, iar utilizatorul poate continua cu atelierul urmator dupa confirmarea rezumatului atelierului curent.

Inainte de utilizare, aplicati migratiile Blueprint in aceasta ordine:

1. `supabase/migrations/20260730000000_extend_blueprint_answers_vertical_slice.sql`
2. `supabase/migrations/20260802000000_extend_blueprint_sections_phase_3.sql`

Continutul Creator Blueprint este pastrat in `content/creator-blueprint.json`.

## Istoric EWA web

Conversatia EWA din versiunea web este pastrata in Supabase, cate una pentru
fiecare utilizator autentificat. Aplicati migratia
`supabase/migrations/20260826000000_create_ewa_chat_history.sql` inainte de
publicarea codului care restaureaza istoricul, apoi migratia
`supabase/migrations/20260905000000_expand_ewa_assistant_messages.sql` pentru a
permite salvarea integrala a raspunsurilor EWA generate. Tabelele `ewa_conversations` si
`ewa_messages` sunt protejate prin RLS si nu acorda administratorilor acces la
conversatiile altor utilizatori.

## Structura proiectului

```text
content/
└── creator-blueprint.json

lib/
├── blueprint/state.js
├── prompts/creatorBlueprint.js
├── server/supabase.js
├── supabaseClient.js
└── supabaseServer.js

pages/
├── api/
│   ├── blueprint.js
│   └── chat.js
├── blueprint.jsx
└── index.jsx

supabase/migrations/
├── 20260730000000_extend_blueprint_answers_vertical_slice.sql
└── 20260802000000_extend_blueprint_sections_phase_3.sql
```

## Verificare

```text
npm test
npm run lint
npm run build
```

## Status

Creator Blueprint Phase 3 este implementat pentru Atelierele 1–7.

Dashboard-ul si abonamentul Stripe apartin etapelor urmatoare ale EWA MVP.
