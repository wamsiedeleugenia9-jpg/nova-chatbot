# EWA AI usage telemetry audit

## Current production architecture

All discovered Anthropic calls are server-side `POST /v1/messages` requests and
use `claude-sonnet-4-6`. The Anthropic Messages response includes `id`, `model`,
and `usage.input_tokens` / `usage.output_tokens`; before this change, the code
parsed the response content but did not retain any usage fields.

| Flow | Call site | Authenticated user available? | Response usage previously captured? | Safe persistence point |
| --- | --- | --- | --- | --- |
| Main EWA chat generation | `pages/api/chat.js`, primary Messages request | Yes: `auth.user.id` | No | Immediately after the successful response JSON is parsed, before extracting the reply |
| Working Memory extraction/update | `pages/api/chat.js`, best-effort extraction request | Yes: `auth.user.id` | No | Immediately after successful extraction response JSON is parsed; memory extraction and storage already remain best-effort |
| Blueprint answer interpretation | `pages/api/blueprint.js`, `askClaude` | Yes in the API handler; it previously was not passed into the helper | No | In the helper after each successful response is parsed |
| Blueprint structured section summary | `pages/api/blueprint.js`, `askClaude` through `summaryWithRetry` | Yes in the API handler; it previously was not passed into the helper | No | In the request callback after each successful response, so a consumed retry is also counted |
| Creator DNA generation/regeneration | `pages/api/blueprint.js`, `askCreatorDna` | Yes in the API handler; it previously was not passed into the helper | No | Immediately after the successful response JSON is parsed |

No other Anthropic endpoint, SDK invocation, or Claude model reference was found
outside these paths. Workshop 8 deliberately preserves the user's text and does
not call Claude for interpretation or summary.

## Minimal pre-pilot implementation

The implementation adds an append-only `public.ai_usage_events` table containing
only the authenticated user identifier, database timestamp, feature, returned
model, input/output token counts, and Anthropic message ID. Prompts, user text,
and generated content are not telemetry.

The table has RLS enabled and no browser-role policies or grants. A small
server-only recorder uses the existing service-role Supabase client. Every
successful Anthropic response is recorded, including each structured-summary
retry. The recorder catches validation, configuration, and insert failures and
returns `false`; therefore a telemetry outage after Claude succeeds cannot alter
the API's user-facing result. The Anthropic response ID provides correlation and
is uniquely indexed to prevent accidental duplicate accounting.

This intentionally adds no dashboard, client response fields, model routing,
caching, quotas, billing calculations, plan limits, or prompt changes.
