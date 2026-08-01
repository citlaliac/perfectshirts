/**
 * Editable product catalog for the Perfect T Shirts storefront.
 *
 * Replace placeholder entries with real shirts when Etsy listings go live:
 * - name, description, priceCents, sizes, colors
 * - imageSrc under /public/shirts/
 * - etsyUrl pointing at the exact listing (not the shop homepage)
 * - set isPlaceholder to false
 */
export type Product = {
  /** URL-safe unique id, e.g. "cool-blue-tee" */
  slug: string;
  name: string;
  description: string;
  /** Display price in USD cents, e.g. 2499 => $24.99 */
  priceCents: number;
  /** Path under /public, e.g. "/shirts/cool-blue-tee.svg" */
  imageSrc: string;
  imageAlt: string;
  /** Human-readable size summary shown on the site (Etsy owns real options). */
  sizesSummary: string;
  /** Human-readable color summary shown on the site. */
  colorsSummary: string;
  /** Exact Etsy listing URL for this shirt. */
  etsyUrl: string;
  /** When true, Buy on Etsy is labeled as a demo link. */
  isPlaceholder: boolean;
  featured?: boolean;
};

export const products: Product[] = [
  {
    slug: "mystery-meatball-tee",
    name: "Mystery Meatball Tee",
    description:
      "A totally real shirt featuring a meatball that may or may not exist. Choose your size on Etsy after you click Buy.",
    priceCents: 2499,
    imageSrc: "/shirts/mystery-meatball-tee.svg",
    imageAlt: "Placeholder drawing of a white t-shirt with a meatball graphic",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "White, Black",
    etsyUrl: "https://www.etsy.com/listing/0000000001/mystery-meatball-tee-placeholder",
    isPlaceholder: true,
    featured: true,
  },
  {
    slug: "extremely-normal-cat",
    name: "Extremely Normal Cat",
    description:
      "A shirt with a cat that is acting extremely normal. Placeholder product until the real listing is posted.",
    priceCents: 2799,
    imageSrc: "/shirts/extremely-normal-cat.svg",
    imageAlt: "Placeholder drawing of a yellow t-shirt with a cat face",
    sizesSummary: "S, M, L, XL, 2XL",
    colorsSummary: "Yellow, Navy",
    etsyUrl: "https://www.etsy.com/listing/0000000002/extremely-normal-cat-placeholder",
    isPlaceholder: true,
  },
];
