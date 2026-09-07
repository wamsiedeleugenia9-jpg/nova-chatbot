create table public.ai_rate_limit_buckets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  call_count integer not null check (call_count >= 0)
);

alter table public.ai_rate_limit_buckets enable row level security;

-- State is mutated only through the narrowly-scoped security-definer functions.
-- No browser CRUD policy is intentionally created.
revoke all on table public.ai_rate_limit_buckets from anon, authenticated;

create or replace function public.consume_ai_call_permit()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_time timestamptz := statement_timestamp();
  bucket public.ai_rate_limit_buckets%rowtype;
  retry_seconds integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  insert into public.ai_rate_limit_buckets (user_id, window_started_at, call_count)
  values (current_user_id, current_time, 0)
  on conflict (user_id) do nothing;

  select * into bucket
  from public.ai_rate_limit_buckets
  where user_id = current_user_id
  for update;

  if current_time >= bucket.window_started_at + interval '60 seconds' then
    update public.ai_rate_limit_buckets
    set window_started_at = current_time, call_count = 1
    where user_id = current_user_id;
    return jsonb_build_object('allowed', true, 'remaining', 29, 'retry_after_seconds', 0);
  end if;

  if bucket.call_count < 30 then
    update public.ai_rate_limit_buckets
    set call_count = call_count + 1
    where user_id = current_user_id;
    return jsonb_build_object('allowed', true, 'remaining', 29 - bucket.call_count, 'retry_after_seconds', 0);
  end if;

  retry_seconds := greatest(1, ceil(extract(epoch from (
    bucket.window_started_at + interval '60 seconds' - current_time
  )))::integer);
  return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after_seconds', retry_seconds);
end;
$$;

create or replace function public.admit_ai_call()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.consume_ai_call_permit();
$$;

create or replace function public.claim_ewa_chat_request(p_request_id uuid, p_user_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  claimed boolean := false;
  existing public.ewa_chat_requests%rowtype;
  admission jsonb;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_user_message is null or char_length(p_user_message) not between 1 and 4000 then
    raise exception 'Invalid user message';
  end if;

  insert into public.ewa_chat_requests (user_id, request_id, user_message)
  values (current_user_id, p_request_id, p_user_message)
  on conflict (user_id, request_id) do nothing;
  claimed := found;

  select * into existing from public.ewa_chat_requests
  where user_id = current_user_id and request_id = p_request_id;

  if existing.user_message <> p_user_message then return jsonb_build_object('status', 'conflict'); end if;
  if not claimed and existing.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'reply', existing.reply);
  end if;
  if not claimed then return jsonb_build_object('status', 'processing'); end if;

  admission := public.consume_ai_call_permit();
  if not (admission->>'allowed')::boolean then
    delete from public.ewa_chat_requests where id = existing.id;
    return jsonb_build_object(
      'status', 'rate_limited',
      'retry_after_seconds', (admission->>'retry_after_seconds')::integer
    );
  end if;
  return jsonb_build_object('status', 'claimed');
end;
$$;

revoke all on function public.consume_ai_call_permit() from public, anon, authenticated;
revoke all on function public.admit_ai_call() from public, anon;
revoke all on function public.claim_ewa_chat_request(uuid, text) from public, anon;
grant execute on function public.admit_ai_call() to authenticated;
grant execute on function public.claim_ewa_chat_request(uuid, text) to authenticated;
