create table if not exists public.creator_dna (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_dna_user_id_key unique (user_id)
);

alter table public.creator_dna enable row level security;

create policy "Users can select their own Creator DNA"
  on public.creator_dna for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own Creator DNA"
  on public.creator_dna for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own Creator DNA"
  on public.creator_dna for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_creator_dna_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_creator_dna_updated_at on public.creator_dna;
create trigger set_creator_dna_updated_at
before update on public.creator_dna
for each row execute function public.set_creator_dna_updated_at();
