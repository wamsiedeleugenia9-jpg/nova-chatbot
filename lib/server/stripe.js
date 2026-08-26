require("server-only");

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
