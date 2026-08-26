require("server-only");

const FOUNDER_ENTITLED_STATUSES = new Set(["active"]);

function isFounderSubscriptionEntitled(subscription, now = new Date()) {
  if (!subscription || subscription.stripe_price_id !== process.env.STRIPE_FOUNDER_PRICE_ID) return false;
  if (!FOUNDER_ENTITLED_STATUSES.has(subscription.status)) return false;
  const periodEnd = Date.parse(subscription.current_period_end || "");
  return Number.isFinite(periodEnd) && periodEnd > now.getTime();
}

async function evaluateFounderEntitlement(client, userId, now = new Date()) {
  const { data, error } = await client
    .from("stripe_subscriptions")
    .select("stripe_price_id,status,cancel_at_period_end,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return isFounderSubscriptionEntitled(data, now);
}

module.exports = { FOUNDER_ENTITLED_STATUSES, evaluateFounderEntitlement, isFounderSubscriptionEntitled };
