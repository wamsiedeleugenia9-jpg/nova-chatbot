create table if not exists public.ewa_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ewa_conversations_user_id_key unique (user_id),
  constraint ewa_conversations_id_user_id_key unique (id, user_id)
);

create table if not exists public.ewa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  ordinal bigint generated always as identity,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint ewa_messages_conversation_owner_fkey
    foreign key (conversation_id, user_id)
    references public.ewa_conversations (id, user_id)
    on delete cascade,
  constraint ewa_messages_conversation_ordinal_key unique (conversation_id, ordinal)
);

create index if not exists ewa_messages_user_conversation_ordinal_idx
  on public.ewa_messages (user_id, conversation_id, ordinal);

alter table public.ewa_conversations enable row level security;
alter table public.ewa_messages enable row level security;

create policy "Users can select their own EWA conversation"
  on public.ewa_conversations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own EWA conversation"
  on public.ewa_conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own EWA conversation"
  on public.ewa_conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own EWA conversation"
  on public.ewa_conversations for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select their own EWA messages"
  on public.ewa_messages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own EWA messages"
  on public.ewa_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own EWA messages"
  on public.ewa_messages for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own EWA messages"
  on public.ewa_messages for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.save_ewa_chat_exchange(
  p_user_message text,
  p_assistant_message text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_user_message is null or char_length(p_user_message) not between 1 and 4000 then
    raise exception 'Invalid user message';
  end if;
  if p_assistant_message is null or char_length(p_assistant_message) not between 1 and 4000 then
    raise exception 'Invalid assistant message';
  end if;

  insert into public.ewa_conversations (user_id)
  values (current_user_id)
  on conflict (user_id) do update set updated_at = now()
  returning id into current_conversation_id;

  insert into public.ewa_messages (conversation_id, user_id, role, content)
  values
    (current_conversation_id, current_user_id, 'user', p_user_message),
    (current_conversation_id, current_user_id, 'assistant', p_assistant_message);

  return current_conversation_id;
end;
$$;

revoke all on function public.save_ewa_chat_exchange(text, text) from public;
revoke all on function public.save_ewa_chat_exchange(text, text) from anon;
grant execute on function public.save_ewa_chat_exchange(text, text) to authenticated;
