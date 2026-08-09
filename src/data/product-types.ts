/**
 * Product catalog types for the Perfect Shirts storefront.
 */

/** One Printify color with front (and optional back) mockup paths. */
export type ProductColor = {
  /** Printify color label, e.g. "Navy" */
  name: string;
  /** Front mockup path under /public */
  frontSrc: string;
  /** Back mockup path under /public when available */
  backSrc?: string;
};

export type Product = {
  /** URL-safe unique id, e.g. "cool-blue-tee" */
  slug: string;
  /** Printify product id when synced from the API */
  printifyId?: string;
  name: string;
  description: string;
  /** Display price in USD cents, e.g. 2500 => $25.00 */
  priceCents: number;
  /** Preferred front mockup path under /public (listing card) */
  imageSrc: string;
  /** Preferred back mockup path under /public (blank back is fine) */
  imageBackSrc?: string;
  imageAlt: string;
  /**
   * All synced Printify colors for the detail gallery.
   * Preferred color is listed first when known.
   */
  colors?: ProductColor[];
  /** Printify product tags (for filtering / sorting on the site). */
  tags?: string[];
  /** Printify created_at (ISO-8601), used for "newest" sort. */
  createdAt?: string;
  /** Exact Etsy listing URL, or the shop URL until listings are ready. */
  etsyUrl: string;
  /** When true, Buy on Etsy is labeled as a demo link. */
  isPlaceholder: boolean;
  featured?: boolean;
};

/** Temporary shared shop link until per-shirt listing URLs exist. */
export const ETSY_SHOP_URL = "https://www.etsy.com/shop/fawnandfrog/";
