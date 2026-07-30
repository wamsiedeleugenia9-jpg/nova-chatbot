alter table public.blueprint_answers
  add column if not exists interpreted_answer text,
  add column if not exists adjustment_request text,
  add column if not exists updated_at timestamptz;

update public.blueprint_answers
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.blueprint_answers
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- The repository has no baseline migration proving the unique keys required by
-- PostgREST upserts. Each block detects an equivalent, non-partial unique index
-- (including one owned by a UNIQUE constraint) before creating anything.
do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_index i
    where i.indrelid = 'public.creator_blueprints'::regclass
      and i.indisunique and i.indisvalid and i.indpred is null and i.indexprs is null
      and i.indnkeyatts = 1
      and (
        select array_agg(a.attname order by a.attname)
        from unnest(i.indkey) with ordinality as key(attnum, ordinality)
        join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = key.attnum
        where key.ordinality <= i.indnkeyatts
      ) = array['user_id']::name[]
  ) then
    create unique index creator_blueprints_user_vs1_uidx
      on public.creator_blueprints (user_id);
  end if;
end
$migration$;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_index i
    where i.indrelid = 'public.blueprint_sections'::regclass
      and i.indisunique and i.indisvalid and i.indpred is null and i.indexprs is null
      and i.indnkeyatts = 2
      and (
        select array_agg(a.attname order by a.attname)
        from unnest(i.indkey) with ordinality as key(attnum, ordinality)
        join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = key.attnum
        where key.ordinality <= i.indnkeyatts
      ) = array['atelier_number', 'user_id']::name[]
  ) then
    create unique index blueprint_sections_user_atelier_vs1_uidx
      on public.blueprint_sections (user_id, atelier_number);
  end if;
end
$migration$;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_index i
    where i.indrelid = 'public.blueprint_answers'::regclass
      and i.indisunique and i.indisvalid and i.indpred is null and i.indexprs is null
      and i.indnkeyatts = 3
      and (
        select array_agg(a.attname order by a.attname)
        from unnest(i.indkey) with ordinality as key(attnum, ordinality)
        join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = key.attnum
        where key.ordinality <= i.indnkeyatts
      ) = array['atelier_number', 'question_number', 'user_id']::name[]
  ) then
    create unique index blueprint_answers_user_atelier_question_vs1_uidx
      on public.blueprint_answers (user_id, atelier_number, question_number);
  end if;
end
$migration$;

create or replace function public.set_blueprint_answer_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_blueprint_answer_updated_at on public.blueprint_answers;
create trigger set_blueprint_answer_updated_at
before update on public.blueprint_answers
for each row execute function public.set_blueprint_answer_updated_at();
