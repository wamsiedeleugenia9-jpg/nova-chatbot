import { authenticatedClient } from "../../../lib/server/supabase";
import { founderCheckoutParams } from "../../../lib/server/checkout";
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
    const session = await getStripe().checkout.sessions.create(founderCheckoutParams(auth.user));
    if (!session.url) throw new Error("Stripe Checkout Session has no URL");
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Session creation failed:", error);
    return res.status(500).json({ error: "Nu am putut porni plata. Incearca din nou." });
  }
}
