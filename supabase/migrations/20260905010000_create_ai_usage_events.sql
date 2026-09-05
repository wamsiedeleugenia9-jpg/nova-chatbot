-- Append-only, server-maintained Anthropic usage ledger. Generated content and
-- prompts are deliberately excluded; only cost/accounting metadata is stored.
create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  feature text not null check (feature in (
    'chat', 'memory', 'blueprint_interpretation', 'blueprint_summary', 'creator_dna'
  )),
  model text not null check (char_length(model) between 1 and 100),
  input_tokens bigint not null check (input_tokens >= 0),
  output_tokens bigint not null check (output_tokens >= 0),
  provider_request_id text check (
    provider_request_id is null or char_length(provider_request_id) between 1 and 255
  )
);

create index ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

create unique index ai_usage_events_provider_request_uidx
  on public.ai_usage_events (provider_request_id)
  where provider_request_id is not null;

alter table public.ai_usage_events enable row level security;

-- Telemetry is neither readable nor writable through the browser's anon or
-- authenticated roles. Server-side instrumentation uses the service role.
revoke all on table public.ai_usage_events from anon, authenticated;
revoke all on sequence public.ai_usage_events_id_seq from anon, authenticated;
