/**
 * Editable product catalog for the Perfect T Shirts storefront.
 *
 * For now every Buy on Etsy link goes to the shop homepage.
 * When you have exact listing URLs, replace etsyUrl per shirt.
 *
 * Image files live in public/shirts/ and must use kebab-case names
 * (no spaces) so they match imageSrc below.
 */
export type Product = {
  /** URL-safe unique id, e.g. "cool-blue-tee" */
  slug: string;
  name: string;
  description: string;
  /** Display price in USD cents, e.g. 2499 => $24.99 */
  priceCents: number;
  /** Path under /public, e.g. "/shirts/cool-blue-tee.png" */
  imageSrc: string;
  imageAlt: string;
  /** Human-readable size summary shown on the site (Etsy owns real options). */
  sizesSummary: string;
  /** Human-readable color summary shown on the site. */
  colorsSummary: string;
  /** Exact Etsy listing URL, or the shop URL until listings are ready. */
  etsyUrl: string;
  /** When true, Buy on Etsy is labeled as a demo link. */
  isPlaceholder: boolean;
  featured?: boolean;
};

/** Temporary shared shop link until per-shirt listing URLs exist. */
const ETSY_SHOP_URL = "https://www.etsy.com/shop/fawnandfrog/";

export const products: Product[] = [
  {
    slug: "beautiful-wife-tee",
    name: "Beautiful Wife Tee",
    description: "",
    priceCents: 2500,
    imageSrc: "/shirts/beautiful-wife-tee.png",
    imageAlt: "Beautiful Wife Tee mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
    featured: true,
  },
  {
    slug: "business-casual-tee",
    name: "Business Casual Tee",
    description: "",
    priceCents: 2500,
    imageSrc: "/shirts/business-casual-tee.png",
    imageAlt: "Business Casual Tee mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
  },
  {
    slug: "business-casualty",
    name: "Business Casualty",
    description: "",
    priceCents: 2500,
    imageSrc: "/shirts/business-casualty.png",
    imageAlt: "Business Casualty t-shirt mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
  },
  {
    slug: "cute-alan-greenspan-tee",
    name: "Cute Alan Greenspan Tee",
    description: "",
    priceCents: 2500,
    imageSrc: "/shirts/cute-alan-greenspan-tee.png",
    imageAlt: "Cute Alan Greenspan Tee mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
  },
  {
    slug: "cute-oil-giant-tee",
    name: "Cute Oil Giant Tee",
    description: "",
    priceCents: 2500,
    imageSrc: "/shirts/cute-oil-giant-tee.png",
    imageAlt: "Cute Oil Giant Tee mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
  },
  {
    slug: "food-spilling-shirt",
    name: "Food Spilling Shirt",
    description: "",
    priceCents: 3000,
    imageSrc: "/shirts/food-spilling-shirt.png",
    imageAlt: "Food Spilling Shirt mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
  },
  {
    slug: "hypno-crime",
    name: "hypNO crime",
    description: "",
    priceCents: 2500,
    imageSrc: "/shirts/hypno-crime.png",
    imageAlt: "hypNO crime t-shirt mockup",
    sizesSummary: "S, M, L, XL",
    colorsSummary: "See Etsy listing",
    etsyUrl: ETSY_SHOP_URL,
    isPlaceholder: false,
  },
];
