import type { MetadataRoute } from "next";

const SITE_URL = "https://nextdoor.deeproduct.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep the auth-gated product app and APIs out of the index.
        disallow: [
          "/api/",
          "/auth/",
          "/chat",
          "/events",
          "/market",
          "/profile",
          "/onboarding",
          "/blocked",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
