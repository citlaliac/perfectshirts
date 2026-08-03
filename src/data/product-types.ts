/**
 * Product catalog types for the Perfect Shirts storefront.
 */
export type Product = {
  /** URL-safe unique id, e.g. "cool-blue-tee" */
  slug: string;
  /** Printify product id when synced from the API */
  printifyId?: string;
  name: string;
  description: string;
  /** Display price in USD cents, e.g. 2500 => $25.00 */
  priceCents: number;
  /** Front mockup path under /public */
  imageSrc: string;
  /** Back mockup path under /public (blank back is fine) */
  imageBackSrc?: string;
  imageAlt: string;
  /** Exact Etsy listing URL, or the shop URL until listings are ready. */
  etsyUrl: string;
  /** When true, Buy on Etsy is labeled as a demo link. */
  isPlaceholder: boolean;
  featured?: boolean;
};

/** Temporary shared shop link until per-shirt listing URLs exist. */
export const ETSY_SHOP_URL = "https://www.etsy.com/shop/fawnandfrog/";
