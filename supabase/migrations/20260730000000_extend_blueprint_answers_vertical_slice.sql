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
