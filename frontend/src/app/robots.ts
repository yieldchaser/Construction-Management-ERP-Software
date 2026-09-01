import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://site-flow-omega.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/c/", "/login", "/onboarding", "/auth/", "/profile/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
