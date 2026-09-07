create or replace function public.consume_ai_call_permit()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_timestamp_value timestamptz := statement_timestamp();
  bucket public.ai_rate_limit_buckets%rowtype;
  retry_seconds integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  insert into public.ai_rate_limit_buckets (user_id, window_started_at, call_count)
  values (current_user_id, current_timestamp_value, 0)
  on conflict (user_id) do nothing;

  select * into bucket
  from public.ai_rate_limit_buckets
  where user_id = current_user_id
  for update;

  if current_timestamp_value >= bucket.window_started_at + interval '60 seconds' then
    update public.ai_rate_limit_buckets
    set window_started_at = current_timestamp_value, call_count = 1
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
    bucket.window_started_at + interval '60 seconds' - current_timestamp_value
  )))::integer);
  return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after_seconds', retry_seconds);
end;
$$;
