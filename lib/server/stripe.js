// `server-only` is an RSC poison pill and cannot be loaded by a Pages Router
// API bundle when Vercel externalizes it. The explicit runtime guard below
// protects the Stripe secret while remaining compatible with Node.js APIs.

const Stripe = require("stripe");

let stripe;

function getStripe() {
  if (typeof window !== "undefined") throw new Error("Stripe is server-only");
  if (stripe) return stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe server configuration is missing");
  stripe = new Stripe(secretKey);
  return stripe;
}

module.exports = { getStripe };
