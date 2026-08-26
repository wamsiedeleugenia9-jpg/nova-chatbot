// `server-only` is an RSC poison pill and cannot be loaded by a Pages Router
// API bundle when Vercel externalizes it. Reject browser execution explicitly
// before loading Supabase so the service-role client remains server-confined.
if (typeof window !== "undefined") {
  throw new Error("The privileged Supabase client is server-only");
}

const { createClient } = require("@supabase/supabase-js");

let privilegedSupabase;

/**
 * Returns the privileged Supabase client for trusted server-side jobs only.
 *
 * This client bypasses Row Level Security. Do not import this module from React
 * components, browser bundles, or code that accepts arbitrary database input.
 */
function getPrivilegedSupabase() {
  if (privilegedSupabase) return privilegedSupabase;

  // The project URL is public configuration, so the browser-safe value is a
  // valid fallback when a separate server alias was not provisioned.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Privileged Supabase server configuration is missing");
  }

  privilegedSupabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return privilegedSupabase;
}

module.exports = { getPrivilegedSupabase };
