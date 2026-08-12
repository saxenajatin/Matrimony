import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Server anon client for public reads.
 * Authenticated mutations go through createAdminClient + AMVS_ RPCs.
 */
export async function createClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
