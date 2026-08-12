/**
 * Resolve a safe absolute site URL for metadata / sitemap.
 * Empty or invalid NEXT_PUBLIC_SITE_URL must not break production builds.
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // try next candidate
    }
  }

  return "http://localhost:3000";
}
