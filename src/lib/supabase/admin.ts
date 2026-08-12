import "server-only";

import { createClient } from "@supabase/supabase-js";

import { assertServiceRoleNotPublic } from "@/lib/security/assert-env";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/**
 * Server-only Supabase client using the service role.
 * Used for custom AMVS_ auth RPCs. Never import from Client Components.
 */
export function createAdminClient() {
  assertServiceRoleNotPublic();
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
