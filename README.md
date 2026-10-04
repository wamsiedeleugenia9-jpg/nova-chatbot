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
| `SUPABASE_SERVICE_ROLE_KEY` | cheia privilegiata folosita doar de webhook-ul Stripe si reconciliere pentru proiectia abonamentelor |
| `STRIPE_SECRET_KEY` | cheia Stripe Sandbox folosita doar server-side |
| `STRIPE_WEBHOOK_SECRET` | secretul de semnare pentru endpoint-ul canonic `https://www.ewaai.ro/api/stripe/webhook` |
| `STRIPE_FOUNDER_PRICE_ID` | ID-ul server-side al pretului Founder |
| `STRIPE_RECONCILIATION_SECRET` | secret bearer aleator pentru ruta server-side de reconciliere |
| `EWA_APP_ORIGIN` | originea canonica a aplicatiei pentru redirecturile Stripe; HTTPS in mediile publice |

Nu adauga valori reale ale cheilor in repository.

## Reconciliere abonamente Stripe

Stripe ramane sursa de adevar, iar webhook-ul canonic este
`https://www.ewaai.ro/api/stripe/webhook` (fara redirect). Pentru recuperarea
unei livrari ratate sau intarziate, un scheduler protejat poate apela periodic:

```sh
curl -X POST https://www.ewaai.ro/api/stripe/reconcile \
  -H "Authorization: Bearer $STRIPE_RECONCILIATION_SECRET"
```

Ruta citeste toate abonamentele istorice Stripe pentru pretul Founder si le
proiecteaza idempotent prin acelasi RPC folosit de webhook. Nu creeaza Checkout
Sessions sau abonamente. Un raspuns non-2xx trebuie alertat si reincercat; pentru
pilot este suficienta programarea externa periodica a acestui apel.

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

## Preflight deployment

### Configurarea mediului

Porniti de la `.env.example`. Valorile de acolo sunt exemple, nu valori functionale. Pentru dezvoltare locala folositi un fisier local neversionat si inlocuiti exemplele cu valorile mediului de test. Pentru Preview si Production configurati valorile reale in Vercel, in mediul corespunzator.

Sunt necesare configuratiile Supabase, Anthropic, Stripe si `EWA_APP_ORIGIN` enumerate in sectiunea de mai sus. Credentialele privilegiate raman exclusiv server-side. `EWA_APP_ORIGIN` trebuie sa fie originea reala a mediului care creeaza Checkout Sessions.

Nu introduceti in deployment valori de exemplu precum `https://your-project.supabase.co`, `your-anon-or-publishable-key` sau `https://your-production-domain.example`.

### Ordinea migratiilor Supabase

Pentru un proiect nou, aplicati fisierele din `supabase/migrations/` in ordinea cronologica a numelui:

1. `20260730000000_extend_blueprint_answers_vertical_slice.sql`
2. `20260802000000_extend_blueprint_sections_phase_3.sql`
3. `20260809000000_create_creator_dna.sql`
4. `20260810000000_create_working_memory.sql`
5. `20260825000000_create_save_blueprint_workshop_edit.sql`
6. `20260825010000_create_user_roles.sql`
7. `20260826000000_create_ewa_chat_history.sql`
8. `20260826010000_create_stripe_subscriptions.sql`
9. `20260826020000_add_stripe_event_ordering.sql`
10. `20260902000000_project_each_stripe_subscription.sql`
11. `20260905000000_expand_ewa_assistant_messages.sql`
12. `20260905010000_create_ai_usage_events.sql`
13. `20260905020000_create_ewa_chat_requests.sql`
14. `20260907000000_create_ai_rate_limit.sql`
15. `20260907010000_fix_ai_rate_limit_current_time_collision.sql`

Nu sariti migratiile intermediare, deoarece cele ulterioare extind sau corecteaza structuri anterioare.

### Verificare inainte de deployment

Rulati:

```sh
npm test
npm run lint
npm run build
```

Toate cele trei verificari trebuie sa treaca in mediul pregatit pentru deployment.

### Eroarea `supabaseUrl is required`

Eroarea indica faptul ca procesul care initializeaza clientul Supabase nu primeste URL-ul proiectului. Verificati `NEXT_PUBLIC_SUPABASE_URL` si, pentru codul server-side, `SUPABASE_URL` sau fallback-ul documentat catre `NEXT_PUBLIC_SUPABASE_URL`.

Local, verificati configuratia de environment si reporniti serverul dupa modificare. In Vercel, verificati ca variabila exista in mediul corect, apoi faceti un deployment nou. Nu folositi URL-ul exemplu din `.env.example`; este necesar URL-ul real al proiectului Supabase.

### Stripe

Configuratia documentata aici este cea implementata in prezent. Pastrati endpoint-ul canonic `https://www.ewaai.ro/api/stripe/webhook`, valorile Stripe corespunzatoare fiecarui mediu si reconcilierea descrisa mai sus. Nu amestecati resursele Sandbox cu cele Live. Orice schimbare viitoare a modelului de billing se documenteaza dupa implementare.

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
├── ...
└── 20260907010000_fix_ai_rate_limit_current_time_collision.sql
```

## Verificare

```text
npm test
npm run lint
npm run build
```

## Status

EWA MVP include in prezent autentificare Supabase, Creator Blueprint cu Atelierele 1–8, generarea Creator DNA, istoric web persistent, roluri owner/admin, protectii de utilizare AI si infrastructura Stripe pentru ciclul de abonament.

Stripe are Checkout server-side, webhook canonic si reconciliere pentru proiectarea starii abonamentelor in Supabase. Dashboard-ul si evolutiile viitoare ale produsului se trateaza separat de functionalitatile deja implementate.

README-ul descrie implementarea curenta. Directiile comerciale sau de billing aflate doar in planificare nu sunt considerate implementate pana cand codul, configuratia si testele aferente exista in repository.
