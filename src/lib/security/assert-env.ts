import "server-only";

/**
 * Fail closed if service-role material is ever exposed under NEXT_PUBLIC_*.
 * Call from server boot paths (admin client) as a safety net.
 */
export function assertServiceRoleNotPublic() {
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    const lower = `${key}=${value ?? ""}`.toLowerCase();
    if (
      lower.includes("service_role") ||
      lower.includes("service-role") ||
      key.toUpperCase().includes("SERVICE_ROLE")
    ) {
      throw new Error(
        "Security violation: service role must never be exposed via NEXT_PUBLIC_* env vars.",
      );
    }
  }
}
