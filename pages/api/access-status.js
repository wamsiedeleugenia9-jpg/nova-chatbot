import { authenticatedClient } from "../../lib/server/supabase";
import { authorizeFounder } from "../../lib/server/founderAccess";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "method_not_allowed" }); }
  // This response controls every Founder UI. A subscription may expire while
  // the Supabase session remains valid, so it must never be reused.
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  try {
    const auth = await authenticatedClient(req);
    if (!auth) return res.status(401).json({ error: "authentication_required" });
    const authorization = await authorizeFounder(auth);
    return res.status(200).json({ entitled: authorization.allowed === true, admin: authorization.access.role === "admin" });
  } catch (error) {
    console.error("Founder access status failed:", error);
    return res.status(500).json({ error: "access_status_failed" });
  }
}
