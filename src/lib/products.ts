import { etsyUrls } from "@/data/etsy-urls";
import { productOrder } from "@/data/product-order";
import type { ProductColor } from "@/data/product-types";
import { products, type Product } from "@/data/products";

export type CatalogSort =
  | "default"
  | "price-asc"
  | "price-desc"
  | "alpha"
  | "newest";

export type TagOption = {
  /** Case-insensitive key used for filtering */
  key: string;
  /** Display label (nicest casing seen in the catalog) */
  label: string;
  count: number;
};

/** Formats price cents as a simple dollar string for the storefront. */
export function formatPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return `$${dollars.toFixed(2)}`;
}

/** Collapse tag mismatches (Capitalization, extra spaces) into one key. */
export function normalizeTagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Prefer a readable label: title-case the normalized key unless a nicer raw exists. */
function pickTagLabel(rawForms: string[], key: string): string {
  // Prefer a form that isn't ALL CAPS / all lower when mixed options exist.
  const scored = [...rawForms].sort((a, b) => {
    const score = (s: string) => {
      const hasUpper = /[A-Z]/.test(s);
      const hasLower = /[a-z]/.test(s);
      if (hasUpper && hasLower) return 0;
      if (hasLower) return 1;
      return 2;
    };
    return score(a) - score(b) || a.localeCompare(b);
  });
  if (scored[0]) return scored[0].trim().replace(/\s+/g, " ");
  return key.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Unique tags across the catalog, grouped by normalized key. */
export function getTagOptions(catalog: Product[] = getAllProducts()): TagOption[] {
  const groups = new Map<string, { rawForms: string[]; slugs: Set<string> }>();
  for (const product of catalog) {
    const seenOnProduct = new Set<string>();
    for (const tag of product.tags ?? []) {
      const key = normalizeTagKey(tag);
      if (!key || seenOnProduct.has(key)) continue;
      seenOnProduct.add(key);
      const entry = groups.get(key) ?? { rawForms: [], slugs: new Set<string>() };
      entry.rawForms.push(tag);
      entry.slugs.add(product.slug);
      groups.set(key, entry);
    }
  }
  return [...groups.entries()]
    .map(([key, { rawForms, slugs }]) => ({
      key,
      label: pickTagLabel(rawForms, key),
      count: slugs.size,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** True when the product has the tag (case/spacing-insensitive). */
export function productHasTag(product: Product, tagKey: string): boolean {
  if (!tagKey) return true;
  return (product.tags ?? []).some((t) => normalizeTagKey(t) === tagKey);
}

/** Sort a catalog copy by the selected mode. */
export function sortProducts(
  catalog: Product[],
  sort: CatalogSort,
): Product[] {
  const copy = [...catalog];
  switch (sort) {
    case "price-asc":
      return copy.sort(
        (a, b) => a.priceCents - b.priceCents || a.name.localeCompare(b.name),
      );
    case "price-desc":
      return copy.sort(
        (a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name),
      );
    case "alpha":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
      return copy.sort((a, b) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bt - at || a.name.localeCompare(b.name);
      });
    case "default":
    default:
      return copy;
  }
}

/**
 * Colors for the detail gallery. Falls back to the listing front/back when
 * a product has not been multi-color synced yet.
 */
export function getProductColors(product: Product): ProductColor[] {
  if (product.colors && product.colors.length > 0) {
    return product.colors;
  }
  return [
    {
      name: "Default",
      frontSrc: product.imageSrc,
      backSrc: product.imageBackSrc,
    },
  ];
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

    for (const color of product.colors ?? []) {
      if (!color.name.trim()) {
        errors.push(`${product.slug}: color entry missing name`);
      }
      if (!color.frontSrc.startsWith("/")) {
        errors.push(`${product.slug}: color "${color.name}" frontSrc must start with /`);
      }
      if (color.backSrc && !color.backSrc.startsWith("/")) {
        errors.push(`${product.slug}: color "${color.name}" backSrc must start with /`);
      }
    }

    if (!isValidEtsyListingUrl(product.etsyUrl)) {
      errors.push(
        `${product.slug}: etsyUrl must be an Etsy listing or shop URL`,
      );
    }
  }

  return errors;
}
