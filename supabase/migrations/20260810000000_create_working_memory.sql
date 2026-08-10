create table if not exists public.working_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in (
    'active_project', 'content_decision', 'temporary_plan', 'next_action',
    'preference_or_workflow', 'other_operational_context'
  )),
  content text not null check (char_length(content) between 1 and 500),
  project_key text check (project_key is null or char_length(project_key) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists working_memory_user_active_idx
  on public.working_memory (user_id, status, updated_at desc);

alter table public.working_memory enable row level security;

create policy "Users can select their own working memory"
  on public.working_memory for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own working memory"
  on public.working_memory for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own working memory"
  on public.working_memory for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own working memory"
  on public.working_memory for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_working_memory_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_working_memory_updated_at on public.working_memory;
create trigger set_working_memory_updated_at
before update on public.working_memory
for each row execute function public.set_working_memory_updated_at();
