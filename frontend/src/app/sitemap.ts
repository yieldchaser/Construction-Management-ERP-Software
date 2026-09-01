import type { MetadataRoute } from "next";
import { getContentItems } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://site-flow-omega.vercel.app";
  const now = new Date();

  // Static marketing routes
  const staticRoutes: string[] = [
    "",
    "/SiteFlow-pricing",
    "/about",
    "/contact",
    "/who-we-serve",
    "/products",
    "/resources",
    "/resources/glossary",
    "/blog",
    "/integrations",
    "/integrations/tally",
    "/help",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/SiteFlow-pricing" ? 0.9 : 0.8,
  }));

  // Dynamic content sections
  const [blogItems, productItems, whoWeServeItems, resourceItems, helpItems] = await Promise.all([
    getContentItems("blog"),
    getContentItems("products"),
    getContentItems("who-we-serve"),
    getContentItems("resources"),
    getContentItems("help"),
  ]);

  const dynamicBlog: MetadataRoute.Sitemap = blogItems.map((item) => ({
    url: `${baseUrl}/blog/${item.slug}`,
    lastModified: item.publishDate ? new Date(item.publishDate) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const dynamicProducts: MetadataRoute.Sitemap = productItems.map((item) => ({
    url: `${baseUrl}/products/${item.slug}`,
    lastModified: item.publishDate ? new Date(item.publishDate) : now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const dynamicWhoWeServe: MetadataRoute.Sitemap = whoWeServeItems.map((item) => ({
    url: `${baseUrl}/who-we-serve/${item.slug}`,
    lastModified: item.publishDate ? new Date(item.publishDate) : now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const dynamicResources: MetadataRoute.Sitemap = resourceItems.map((item) => ({
    url: `${baseUrl}/resources/${item.slug}`,
    lastModified: item.publishDate ? new Date(item.publishDate) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const dynamicHelp: MetadataRoute.Sitemap = helpItems.map((item) => ({
    url: `${baseUrl}/help/${item.slug}`,
    lastModified: item.publishDate ? new Date(item.publishDate) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Combine and deduplicate by URL
  const allEntries = [
    ...staticEntries,
    ...dynamicBlog,
    ...dynamicProducts,
    ...dynamicWhoWeServe,
    ...dynamicResources,
    ...dynamicHelp,
  ];

  const seenUrls = new Set<string>();
  const uniqueEntries: MetadataRoute.Sitemap = [];
  for (const entry of allEntries) {
    if (!seenUrls.has(entry.url)) {
      seenUrls.add(entry.url);
      uniqueEntries.push(entry);
    }
  }

  return uniqueEntries;
}
