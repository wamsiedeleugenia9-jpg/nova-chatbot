import { getPrivilegedSupabase } from "../../../lib/server/privilegedSupabase";
import { getStripe } from "../../../lib/server/stripe";
import { synchronizeFounderSubscription } from "../../../lib/server/stripeSubscriptions";

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is missing");
    event = getStripe().webhooks.constructEvent(await rawBody(req), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature rejected:", error.message);
    return res.status(400).json({ error: "invalid_signature" });
  }

  try {
    let subscription = null;
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      subscription = event.data.object;
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        subscription = await getStripe().subscriptions.retrieve(session.subscription);
      }
    }
    if (subscription) await synchronizeFounderSubscription(getPrivilegedSupabase(), subscription, event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Verified Stripe webhook processing failed:", error);
    return res.status(500).json({ error: "webhook_processing_failed" });
  }
}
