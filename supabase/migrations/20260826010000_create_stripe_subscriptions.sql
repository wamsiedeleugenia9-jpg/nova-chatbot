-- Server-maintained projection of Stripe subscription state. Application users
-- can inspect their own row, but only trusted service-role code may mutate it.
create table public.stripe_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  stripe_price_id text not null,
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_subscriptions_customer_id_key unique (stripe_customer_id),
  constraint stripe_subscriptions_subscription_id_key unique (stripe_subscription_id)
);

create index stripe_subscriptions_status_idx
  on public.stripe_subscriptions (status);
create index stripe_subscriptions_current_period_end_idx
  on public.stripe_subscriptions (current_period_end);

alter table public.stripe_subscriptions enable row level security;

create policy "Users can read their own Stripe subscription"
  on public.stripe_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT, UPDATE, or DELETE policy exists for authenticated users. Explicit
-- grants expose only SELECT through Supabase's authenticated API role.
revoke all on table public.stripe_subscriptions from anon, authenticated;
grant select on table public.stripe_subscriptions to authenticated;

create or replace function public.set_stripe_subscriptions_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_stripe_subscriptions_updated_at
  on public.stripe_subscriptions;
create trigger set_stripe_subscriptions_updated_at
before update on public.stripe_subscriptions
for each row execute function public.set_stripe_subscriptions_updated_at();
