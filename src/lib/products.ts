import { products, type Product } from "@/data/products";

/** Formats price cents as a simple dollar string for the crude storefront. */
export function formatPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return `$${dollars.toFixed(2)}`;
}

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

/**
 * Returns true when the URL looks like an Etsy listing page.
 * Placeholders may use zeroed listing ids; live products should use real ones.
 */
export function isValidEtsyListingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostOk =
      parsed.hostname === "www.etsy.com" || parsed.hostname === "etsy.com";
    const pathOk = /^\/listing\/\d+\/[\w-]+/.test(parsed.pathname);
    return hostOk && pathOk;
  } catch {
    return false;
  }
}

/** Collects catalog issues that would break purchase handoff. */
export function validateProducts(catalog: Product[] = products): string[] {
  const errors: string[] = [];
  const seenSlugs = new Set<string>();

  if (catalog.length === 0) {
    errors.push("Catalog is empty.");
  }

  for (const product of catalog) {
    if (!product.slug.trim()) {
      errors.push("A product is missing a slug.");
      continue;
    }

    if (seenSlugs.has(product.slug)) {
      errors.push(`Duplicate slug: ${product.slug}`);
    }
    seenSlugs.add(product.slug);

    if (!product.name.trim()) {
      errors.push(`${product.slug}: missing name`);
    }

    if (!Number.isInteger(product.priceCents) || product.priceCents <= 0) {
      errors.push(`${product.slug}: priceCents must be a positive integer`);
    }

    if (!product.imageSrc.startsWith("/")) {
      errors.push(`${product.slug}: imageSrc must start with /`);
    }

    if (!isValidEtsyListingUrl(product.etsyUrl)) {
      errors.push(
        `${product.slug}: etsyUrl must be an Etsy listing URL like https://www.etsy.com/listing/123/slug`,
      );
    }
  }

  return errors;
}
