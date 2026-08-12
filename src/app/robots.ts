import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

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
