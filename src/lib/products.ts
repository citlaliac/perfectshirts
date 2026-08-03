import { etsyUrls } from "@/data/etsy-urls";
import { productOrder } from "@/data/product-order";
import { products, type Product } from "@/data/products";

/** Formats price cents as a simple dollar string for the storefront. */
export function formatPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return `$${dollars.toFixed(2)}`;
}

/** Prefer the hand-mapped listing URL when one exists for this slug. */
function withEtsyUrl(product: Product): Product {
  const listingUrl = etsyUrls[product.slug];
  if (!listingUrl) return product;
  return {
    ...product,
    etsyUrl: listingUrl,
    isPlaceholder: false,
  };
}

/**
 * Catalog in the hand-picked order from `src/data/product-order.ts`.
 * Unknown / new slugs (not in that file) append after the ordered ones.
 */
export function getAllProducts(): Product[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const ordered: Product[] = [];

  for (const slug of productOrder) {
    const product = bySlug.get(slug);
    if (product) {
      ordered.push(withEtsyUrl(product));
      bySlug.delete(slug);
    }
  }

  // Anything not listed in product-order.ts (e.g. newly synced) goes last.
  for (const product of products) {
    if (bySlug.has(product.slug)) {
      ordered.push(withEtsyUrl(product));
      bySlug.delete(product.slug);
    }
  }

  return ordered;
}

export function getProductBySlug(slug: string): Product | undefined {
  const product = products.find((entry) => entry.slug === slug);
  return product ? withEtsyUrl(product) : undefined;
}

/**
 * Returns true for an Etsy listing URL or an Etsy shop URL.
 * Prefer exact listing URLs when available; shop URLs are OK temporarily.
 */
export function isValidEtsyListingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostOk =
      parsed.hostname === "www.etsy.com" || parsed.hostname === "etsy.com";
    const isListing = /^\/listing\/\d+(\/[\w-]*)?\/?$/.test(parsed.pathname);
    const isShop = /^\/shop\/[\w-]+\/?$/.test(parsed.pathname);
    return hostOk && (isListing || isShop);
  } catch {
    return false;
  }
}

/** Collects catalog issues that would break purchase handoff. */
export function validateProducts(catalog: Product[] = getAllProducts()): string[] {
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

    if (product.imageBackSrc && !product.imageBackSrc.startsWith("/")) {
      errors.push(`${product.slug}: imageBackSrc must start with /`);
    }

    if (!isValidEtsyListingUrl(product.etsyUrl)) {
      errors.push(
        `${product.slug}: etsyUrl must be an Etsy listing or shop URL`,
      );
    }
  }

  return errors;
}
