import "server-only";

import type { SessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AmvsRole } from "@/types/database";

export async function getUserRoles(userId: string): Promise<AmvsRole[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("AMVS_UserRoles")
    .select("Role")
    .eq("UserId", userId);

  if (!error && Array.isArray(data)) {
    return data
      .map((row) => row.Role as AmvsRole)
      .filter((role): role is AmvsRole => role === "admin" || role === "user");
  }

  // Fallback via existing RPC if table select is blocked
  const { data: isAdmin } = await admin.rpc("AMVS_HasRole", {
    p_user_id: userId,
    p_role: "admin",
  });
  const { data: isUser } = await admin.rpc("AMVS_HasRole", {
    p_user_id: userId,
    p_role: "user",
  });

  const roles: AmvsRole[] = [];
  if (isUser) roles.push("user");
  if (isAdmin) roles.push("admin");
  return roles;
}

export function hasRole(
  user: Pick<SessionUser, "roles"> | null | undefined,
  role: AmvsRole,
): boolean {
  return Boolean(user?.roles?.includes(role));
}

export function isAdmin(user: Pick<SessionUser, "roles"> | null | undefined) {
  return hasRole(user, "admin");
}

/** Default landing path after login based on role. */
export function homePathForRoles(roles: AmvsRole[]): string {
  if (roles.includes("admin")) return "/admin";
  return "/dashboard";
}
