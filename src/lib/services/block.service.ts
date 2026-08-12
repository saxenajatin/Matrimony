import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function areUsersBlocked(
  userA: string,
  userB: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const [forward, reverse] = await Promise.all([
    admin
      .from("AMVS_Blocks")
      .select("Id")
      .eq("BlockerUserId", userA)
      .eq("BlockedUserId", userB)
      .maybeSingle(),
    admin
      .from("AMVS_Blocks")
      .select("Id")
      .eq("BlockerUserId", userB)
      .eq("BlockedUserId", userA)
      .maybeSingle(),
  ]);

  if (forward.error) throw forward.error;
  if (reverse.error) throw reverse.error;
  return Boolean(forward.data || reverse.data);
}
