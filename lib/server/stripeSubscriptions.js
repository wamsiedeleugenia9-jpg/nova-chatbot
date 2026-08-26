// `server-only` is an RSC poison pill and cannot be loaded by a Pages Router
// API bundle when Vercel externalizes it. This runtime guard keeps subscription
// synchronization unavailable to browser code without entering that path.
if (typeof window !== "undefined") {
  throw new Error("Stripe subscription synchronization is server-only");
}

function unixDate(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function founderItem(subscription) {
  const priceId = process.env.STRIPE_FOUNDER_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_FOUNDER_PRICE_ID is missing");
  return subscription?.items?.data?.find(item => stripePriceId(item) === priceId) || null;
}

function stripePriceId(item) {
  if (typeof item?.price === "string") return item.price;
  return item?.price?.id || null;
}

function trustedUserId(subscription) {
  const userId = subscription?.metadata?.ewa_user_id;
  if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Stripe subscription has no trusted EWA user mapping");
  }
  return userId;
}

async function synchronizeFounderSubscription(client, subscription, event) {
  const item = founderItem(subscription);
  if (!item) return { ignored: true, reason: "not_founder_price" };
  const priceId = stripePriceId(item);
  const periodStart = item.current_period_start ?? subscription.current_period_start;
  const periodEnd = item.current_period_end ?? subscription.current_period_end;
  const payload = {
    p_user_id: trustedUserId(subscription),
    p_stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    p_stripe_subscription_id: subscription.id,
    p_stripe_price_id: priceId,
    p_status: subscription.status,
    p_cancel_at_period_end: subscription.cancel_at_period_end === true,
    p_current_period_start: unixDate(periodStart),
    p_current_period_end: unixDate(periodEnd),
    p_canceled_at: unixDate(subscription.canceled_at),
    p_ended_at: unixDate(subscription.ended_at),
    p_event_created: event.created,
    p_event_id: event.id
  };
  const { data, error } = await client.rpc("sync_stripe_subscription", payload);
  if (error) throw error;
  if (data === false) return { ignored: true, reason: "stale_or_duplicate_event", userId: payload.p_user_id };
  if (data !== true) throw new Error("Stripe subscription synchronization returned an unexpected result");
  return { ignored: false, userId: payload.p_user_id };
}

module.exports = { founderItem, stripePriceId, synchronizeFounderSubscription, trustedUserId, unixDate };
