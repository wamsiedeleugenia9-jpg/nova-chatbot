-- Persist a completed-workshop edit as one transaction. Model generation happens
-- before this function is called, so failures cannot leave confirmed data half-written.
create or replace function public.save_blueprint_workshop_edit(
  p_atelier_number integer,
  p_changed_answers jsonb,
  p_summary text,
  p_key_elements jsonb,
  p_creator_dna jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_atelier_number not between 1 and 8
    or jsonb_typeof(p_changed_answers) <> 'array'
    or nullif(btrim(p_summary), '') is null
    or jsonb_typeof(p_key_elements) <> 'array'
    or jsonb_typeof(p_creator_dna) <> 'object'
  then raise exception 'Invalid workshop edit'; end if;

  update public.blueprint_answers as answer
  set raw_answer = change.value->>'rawAnswer',
      interpreted_answer = change.value->>'interpretation',
      adjustment_request = null,
      updated_at = now()
  from jsonb_array_elements(p_changed_answers) as change(value)
  where answer.user_id = auth.uid()
    and answer.atelier_number = p_atelier_number
    and answer.question_number = (change.value->>'questionNumber')::integer;
  get diagnostics changed_count = row_count;
  if changed_count <> jsonb_array_length(p_changed_answers) then
    raise exception 'One or more persisted answers were not found';
  end if;

  update public.blueprint_sections
  set interpreted_summary = p_summary,
      key_elements = p_key_elements,
      status = 'de_revizuit',
      confirmed_at = null,
      updated_at = now()
  where user_id = auth.uid() and atelier_number = p_atelier_number;
  if not found then raise exception 'Workshop section was not found'; end if;

  update public.creator_dna
  set sections = p_creator_dna, updated_at = now()
  where user_id = auth.uid();
  if not found then raise exception 'Creator DNA was not found'; end if;
end;
$$;

revoke all on function public.save_blueprint_workshop_edit(integer, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.save_blueprint_workshop_edit(integer, jsonb, text, jsonb, jsonb) to authenticated;
