if (typeof window !== "undefined") {
  throw new Error("Stripe reconciliation authentication is server-only");
}

const { timingSafeEqual } = require("node:crypto");

function hasValidReconciliationAuthorization(authorization, secret = process.env.STRIPE_RECONCILIATION_SECRET) {
  if (!secret || typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

module.exports = { hasValidReconciliationAuthorization };
