import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/contact", "/privacy", "/terms", "/safety", "/help"],
      disallow: [
        "/dashboard",
        "/onboarding",
        "/profiles",
        "/matches",
        "/interests",
        "/shortlist",
        "/messages",
        "/notifications",
        "/settings",
        "/admin",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/auth/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
