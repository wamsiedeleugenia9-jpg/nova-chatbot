import { getPrivilegedSupabase } from "../../../lib/server/privilegedSupabase";
import { hasValidReconciliationAuthorization } from "../../../lib/server/reconciliationAuth";
import { getStripe } from "../../../lib/server/stripe";
import { reconcileFounderSubscriptions } from "../../../lib/server/stripeSubscriptions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!process.env.STRIPE_RECONCILIATION_SECRET) {
    console.error("Stripe reconciliation configuration is missing");
    return res.status(500).json({ error: "reconciliation_not_configured" });
  }
  if (!hasValidReconciliationAuthorization(req.headers.authorization)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const result = await reconcileFounderSubscriptions(getStripe(), getPrivilegedSupabase());
    return res.status(200).json(result);
  } catch (error) {
    console.error("Stripe subscription reconciliation failed:", error);
    return res.status(500).json({ error: "reconciliation_failed" });
  }
}
