create table public.ewa_chat_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  user_message text not null check (char_length(user_message) between 1 and 4000),
  status text not null default 'processing' check (status in ('processing', 'completed')),
  reply text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ewa_chat_requests_user_request_key unique (user_id, request_id),
  constraint ewa_chat_requests_completion_check check (
    (status = 'processing' and reply is null and completed_at is null)
    or (status = 'completed' and reply is not null and char_length(reply) >= 1 and completed_at is not null)
  )
);

alter table public.ewa_chat_requests enable row level security;

create policy "Users can select their own EWA chat requests"
  on public.ewa_chat_requests for select to authenticated
  using ((select auth.uid()) = user_id);

-- Mutations are restricted to the narrowly-scoped RPCs below.
revoke all on table public.ewa_chat_requests from anon, authenticated;
grant select on table public.ewa_chat_requests to authenticated;

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
  if claimed then return jsonb_build_object('status', 'claimed'); end if;
  if existing.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'reply', existing.reply);
  end if;
  return jsonb_build_object('status', 'processing');
end;
$$;

create or replace function public.complete_ewa_chat_request(
  p_request_id uuid, p_user_message text, p_assistant_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_conversation_id uuid;
  request_row public.ewa_chat_requests%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_user_message is null or char_length(p_user_message) not between 1 and 4000 then raise exception 'Invalid user message'; end if;
  if p_assistant_message is null or char_length(p_assistant_message) < 1 then raise exception 'Invalid assistant message'; end if;

  select * into request_row from public.ewa_chat_requests
  where user_id = current_user_id and request_id = p_request_id for update;
  if not found or request_row.status <> 'processing' or request_row.user_message <> p_user_message then
    raise exception 'Invalid chat request completion';
  end if;

  insert into public.ewa_conversations (user_id) values (current_user_id)
  on conflict (user_id) do update set updated_at = now()
  returning id into current_conversation_id;
  insert into public.ewa_messages (conversation_id, user_id, role, content) values
    (current_conversation_id, current_user_id, 'user', p_user_message),
    (current_conversation_id, current_user_id, 'assistant', p_assistant_message);
  update public.ewa_chat_requests set status = 'completed', reply = p_assistant_message, completed_at = now()
  where id = request_row.id;
  return current_conversation_id;
end;
$$;

revoke all on function public.claim_ewa_chat_request(uuid, text) from public, anon;
revoke all on function public.complete_ewa_chat_request(uuid, text, text) from public, anon;
grant execute on function public.claim_ewa_chat_request(uuid, text) to authenticated;
grant execute on function public.complete_ewa_chat_request(uuid, text, text) to authenticated;
