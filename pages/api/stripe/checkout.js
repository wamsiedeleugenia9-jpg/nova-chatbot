import { authenticatedClient } from "../../../lib/server/supabase";
import { founderCheckoutIdempotencyKey, founderCheckoutParams } from "../../../lib/server/checkout";
import { authorizeFounder } from "../../../lib/server/founderAccess";
import { getStripe } from "../../../lib/server/stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metoda nu este permisa." });
  }

  let auth;
  try {
    auth = await authenticatedClient(req);
  } catch (error) {
    console.error("Stripe Checkout authentication configuration error:", error);
    return res.status(500).json({ error: "Serviciul nu este configurat." });
  }
  if (!auth) return res.status(401).json({ error: "Autentificare necesara." });

  try {
    const authorization = await authorizeFounder(auth);
    if (authorization.allowed === true) return res.status(409).json({ error: "subscription_already_active" });

    const { data: previousSubscriptions, error: subscriptionError } = await auth.client
      .from("stripe_subscriptions")
      .select("stripe_subscription_id,stripe_customer_id")
      .eq("user_id", auth.user.id)
      .order("last_stripe_event_created", { ascending: false })
      .order("last_stripe_event_id", { ascending: false })
      .limit(1);
    if (subscriptionError) throw subscriptionError;
    const previousSubscription = previousSubscriptions?.[0];

    const session = await getStripe().checkout.sessions.create(
      founderCheckoutParams(auth.user, previousSubscription?.stripe_customer_id),
      { idempotencyKey: founderCheckoutIdempotencyKey(auth.user.id, previousSubscription?.stripe_subscription_id) }
    );
    if (!session.url) throw new Error("Stripe Checkout Session has no URL");
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Session creation failed:", error);
    return res.status(500).json({ error: "Nu am putut porni plata. Incearca din nou." });
  }
}
