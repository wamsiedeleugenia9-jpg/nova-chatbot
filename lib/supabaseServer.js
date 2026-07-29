import { createClient } from "@supabase/supabase-js";

let supabaseServer;

export function getSupabaseServer() {
  if (supabaseServer) return supabaseServer;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Lipsesc SUPABASE_URL sau SUPABASE_ANON_KEY.");
  }

  // This client only verifies user access tokens. Never use a service-role key here.
  supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseServer;
}
