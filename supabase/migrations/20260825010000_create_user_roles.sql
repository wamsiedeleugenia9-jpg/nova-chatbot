-- Application roles are intentionally separate from auth user metadata. Only
-- trusted database operators (or the service_role) can assign or change them.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create policy "Users can read their own role"
  on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT, UPDATE or DELETE policy is created for authenticated users.
-- Explicit grants keep role assignment unavailable through the public API.
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

create or replace function public.set_user_roles_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_user_roles_updated_at();
