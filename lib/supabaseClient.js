import { createClient } from "@supabase/supabase-js";

// Clientul Supabase pentru browser. Foloseste doar cheia publishable (anon),
// sigura de expus, protejata de RLS. Niciodata cheia service_role aici.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
