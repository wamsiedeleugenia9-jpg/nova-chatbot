// `server-only` is an RSC poison pill and cannot be loaded by a Pages Router
// API bundle when Vercel externalizes it. Keep this module unavailable to
// browser code with an explicit runtime guard instead.
if (typeof window !== "undefined") {
  throw new Error("Stripe Checkout configuration is server-only");
}

function applicationOrigin() {
  const configured = process.env.EWA_APP_ORIGIN;
  if (!configured) throw new Error("EWA application origin is missing");

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("EWA application origin is invalid");
  }

  const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !isLocalHttp) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("EWA application origin is invalid");
  }
  return url.origin;
}

function founderCheckoutParams(user) {
  const priceId = process.env.STRIPE_FOUNDER_PRICE_ID;
  if (!priceId) throw new Error("Stripe Founder price configuration is missing");
  if (!user?.id) throw new Error("Authenticated user is required");

  const origin = applicationOrigin();
  return {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { ewa_user_id: user.id },
    subscription_data: { metadata: { ewa_user_id: user.id } },
    ...(user.email ? { customer_email: user.email } : {}),
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`
  };
}

function founderCheckoutIdempotencyKey(userId, previousSubscriptionId) {
  if (!userId) throw new Error("Authenticated user is required");
  return `founder-checkout:${userId}:${previousSubscriptionId || "initial"}`;
}

module.exports = { applicationOrigin, founderCheckoutIdempotencyKey, founderCheckoutParams };
