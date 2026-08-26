require("server-only");

const { createClient } = require("@supabase/supabase-js");

let privilegedSupabase;

/**
 * Returns the privileged Supabase client for trusted server-side jobs only.
 *
 * This client bypasses Row Level Security. Do not import this module from React
 * components, browser bundles, or code that accepts arbitrary database input.
 */
function getPrivilegedSupabase() {
  if (typeof window !== "undefined") {
    throw new Error("The privileged Supabase client is server-only");
  }

  if (privilegedSupabase) return privilegedSupabase;

  const url = process.env.SUPABASE_URL;
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
