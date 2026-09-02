-- A user can have more than one Stripe subscription. Preserve each subscription's
-- state independently so an event for one subscription cannot hide another one.
alter table public.stripe_subscriptions
  drop constraint stripe_subscriptions_pkey,
  drop constraint stripe_subscriptions_customer_id_key,
  drop constraint stripe_subscriptions_subscription_id_key,
  add constraint stripe_subscriptions_pkey primary key (stripe_subscription_id);

create index stripe_subscriptions_user_id_idx
  on public.stripe_subscriptions (user_id);

create or replace function public.sync_stripe_subscription(
  p_user_id uuid, p_stripe_customer_id text, p_stripe_subscription_id text,
  p_stripe_price_id text, p_status text, p_cancel_at_period_end boolean,
  p_current_period_start timestamptz, p_current_period_end timestamptz,
  p_canceled_at timestamptz, p_ended_at timestamptz,
  p_event_created bigint, p_event_id text
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stripe_subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status,
    cancel_at_period_end, current_period_start, current_period_end, canceled_at,
    ended_at, last_stripe_event_created, last_stripe_event_id
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_stripe_price_id,
    p_status, p_cancel_at_period_end, p_current_period_start, p_current_period_end,
    p_canceled_at, p_ended_at, p_event_created, p_event_id
  )
  on conflict (stripe_subscription_id) do update set
    user_id = excluded.user_id,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_price_id = excluded.stripe_price_id, status = excluded.status,
    cancel_at_period_end = excluded.cancel_at_period_end,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end, canceled_at = excluded.canceled_at,
    ended_at = excluded.ended_at,
    last_stripe_event_created = excluded.last_stripe_event_created,
    last_stripe_event_id = excluded.last_stripe_event_id
  where (public.stripe_subscriptions.last_stripe_event_created,
         public.stripe_subscriptions.last_stripe_event_id)
      < (excluded.last_stripe_event_created, excluded.last_stripe_event_id);
  return found;
end;
$$;

revoke all on function public.sync_stripe_subscription(uuid,text,text,text,text,boolean,timestamptz,timestamptz,timestamptz,timestamptz,bigint,text) from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription(uuid,text,text,text,text,boolean,timestamptz,timestamptz,timestamptz,timestamptz,bigint,text) to service_role;
