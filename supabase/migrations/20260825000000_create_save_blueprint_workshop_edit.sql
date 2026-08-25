create or replace function public.save_blueprint_workshop_edit(
  p_atelier_number integer,
  p_answers jsonb,
  p_interpreted_summary text,
  p_key_elements jsonb,
  p_creator_dna_sections jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  answer_record record;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_atelier_number < 1 or p_atelier_number > 8 then
    raise exception 'Invalid workshop number';
  end if;

  for answer_record in
    select *
    from jsonb_to_recordset(coalesce(p_answers, '[]'::jsonb)) as answer(
      question_number integer,
      raw_answer text,
      interpreted_answer text
    )
  loop
    insert into public.blueprint_answers (
      user_id, atelier_number, question_number, raw_answer,
      interpreted_answer, adjustment_request, updated_at
    ) values (
      current_user_id, p_atelier_number, answer_record.question_number,
      answer_record.raw_answer, answer_record.interpreted_answer, null, now()
    )
    on conflict (user_id, atelier_number, question_number) do update set
      raw_answer = excluded.raw_answer,
      interpreted_answer = excluded.interpreted_answer,
      adjustment_request = null,
      updated_at = excluded.updated_at;
  end loop;

  update public.blueprint_sections
  set interpreted_summary = p_interpreted_summary,
      key_elements = p_key_elements,
      status = 'de_revizuit',
      confirmed_at = null,
      updated_at = now()
  where user_id = current_user_id
    and atelier_number = p_atelier_number;

  if not found then
    raise exception 'Workshop section not found';
  end if;

  insert into public.creator_dna (user_id, sections, updated_at)
  values (current_user_id, p_creator_dna_sections, now())
  on conflict (user_id) do update set
    sections = excluded.sections,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_blueprint_workshop_edit(integer, jsonb, text, jsonb, jsonb) from public;
grant execute on function public.save_blueprint_workshop_edit(integer, jsonb, text, jsonb, jsonb) to authenticated;
