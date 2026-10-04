import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";

/** Required for `output: "export"` — sitemap is baked at build time. */
export const dynamic = "force-static";
export const revalidate = false;

const SITE_URL = "https://perfectshirts.net";

/**
 * Static sitemap: home + one URL per shirt detail page.
 * Trailing slashes match next.config `trailingSlash: true`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const home: MetadataRoute.Sitemap[number] = {
    url: `${SITE_URL}/`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1,
  };

  const shirts = getAllProducts().map((product) => ({
    url: `${SITE_URL}/shirts/${product.slug}/`,
    lastModified: product.createdAt ? new Date(product.createdAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [home, ...shirts];
}
