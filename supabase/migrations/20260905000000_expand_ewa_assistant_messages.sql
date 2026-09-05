alter table public.ewa_messages
  drop constraint if exists ewa_messages_content_check;

alter table public.ewa_messages
  add constraint ewa_messages_content_check check (
    (role = 'user' and char_length(content) between 1 and 4000)
    or (role = 'assistant' and char_length(content) >= 1)
  );

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
  if p_assistant_message is null or char_length(p_assistant_message) < 1 then
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
