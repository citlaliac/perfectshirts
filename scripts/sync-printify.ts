/**
 * Sync catalog from Printify: title, price, front + back mockups.
 *
 * Setup:
 *   1. Copy .env.example → .env.local
 *   2. Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID
 *   3. Edit src/data/mockup-colors.ts for preferred shirt colors
 *   4. npm run sync:printify
 *
 * Options:
 *   npm run sync:printify -- --list-shops
 *   npm run sync:printify -- --list-colors
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockupColors } from "../src/data/mockup-colors";
import { etsyUrls } from "../src/data/etsy-urls";
import { cutoutShirt } from "./lib/cutout-shirt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SHIRTS_DIR = path.join(ROOT, "public", "shirts");
const PRODUCTS_OUT = path.join(ROOT, "src", "data", "products.ts");
const API_BASE = "https://api.printify.com/v1";

type PrintifyImage = {
  src: string;
  variant_ids?: number[];
  position?: string;
  is_default?: boolean;
};

type PrintifyVariant = {
  id: number;
  price: number;
  is_enabled?: boolean;
  title?: string;
};

type PrintifyProduct = {
  id: string;
  title: string;
  description?: string;
  visible?: boolean;
  images?: PrintifyImage[];
  variants?: PrintifyVariant[];
};

type PrintifyProductList = {
  current_page: number;
  last_page?: number;
  data: PrintifyProduct[];
};

type PrintifyShop = {
  id: number;
  title: string;
};

/** Load KEY=value pairs from .env.local / .env without printing secrets. */
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cameraLabel(src: string): string {
  try {
    return new URL(src).searchParams.get("camera_label")?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

function isFrontImage(img: PrintifyImage): boolean {
  const pos = (img.position ?? "").toLowerCase();
  const cam = cameraLabel(img.src);
  if (pos === "front" || cam === "front") return true;
  if (pos.includes("back") || cam.includes("back")) return false;
  if (cam.includes("front") && !cam.includes("back")) return true;
  return pos === "front";
}

function isBackImage(img: PrintifyImage): boolean {
  const pos = (img.position ?? "").toLowerCase();
  const cam = cameraLabel(img.src);
  return pos === "back" || cam === "back" || cam.startsWith("back");
}

/** Color name from a Printify variant title like "Teal / L". */
function variantColor(title: string | undefined): string {
  if (!title) return "";
  return title.split("/")[0]?.trim() ?? "";
}

/** Unique enabled colors for a product, sorted for readable logs. */
function listProductColors(variants: PrintifyVariant[] | undefined): string[] {
  const colors = new Set<string>();
  for (const variant of variants ?? []) {
    if (variant.is_enabled === false) continue;
    const color = variantColor(variant.title);
    if (color) colors.add(color);
  }
  return [...colors].sort((a, b) => a.localeCompare(b));
}

/**
 * Variant ids whose color matches the preferred name (substring, case-insensitive).
 * Returns the matched Printify color label when found.
 */
function matchColorVariantIds(
  variants: PrintifyVariant[] | undefined,
  preferred: string | undefined,
): { ids: Set<number>; matchedColor?: string; sampleId?: number } {
  if (!preferred?.trim()) return { ids: new Set() };
  const needle = preferred.trim().toLowerCase();
  const ids = new Set<number>();
  let matchedColor: string | undefined;
  let sampleId: number | undefined;
  let sampleIsL = false;

  for (const variant of variants ?? []) {
    if (variant.is_enabled === false) continue;
    const color = variantColor(variant.title);
    if (!color) continue;
    const hay = color.toLowerCase();
    if (hay === needle || hay.includes(needle) || needle.includes(hay)) {
      ids.add(variant.id);
      matchedColor ??= color;
      // Prefer an L mockup when rewriting URLs — Printify often seeds gallery with L.
      const isL = /\bL\b/i.test(variant.title ?? "");
      if (sampleId == null || (isL && !sampleIsL)) {
        sampleId = variant.id;
        sampleIsL = isL;
      }
    }
  }
  return { ids, matchedColor, sampleId };
}

/**
 * Printify mockup URLs encode the shirt color as the variant id in the path:
 *   /mockup/{productId}/{variantId}/{cameraId}/file.jpg
 * The images[].variant_ids array lists EVERY enabled color, so it cannot be used
 * to pick a color — only this path segment can.
 */
function mockupUrlVariantId(src: string): number | undefined {
  try {
    const match = new URL(src).pathname.match(/\/mockup\/[^/]+\/(\d+)\//);
    return match ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

/** Camera / mockup-style id from a Printify mockup URL path. */
function mockupUrlCameraId(src: string): number | undefined {
  try {
    const parts = new URL(src).pathname.split("/");
    // ['', 'mockup', productId, variantId, cameraId, file]
    const id = Number(parts[4]);
    return Number.isFinite(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/** Swap the color-encoding variant id in a Printify mockup URL. */
function rewriteMockupVariant(src: string, variantId: number): string {
  return src.replace(/(\/mockup\/[^/]+\/)\d+(\/)/, `$1${variantId}$2`);
}

/**
 * Learn front→back camera id pairs from products that already expose both
 * in the API gallery (e.g. 98988→98989). Used to synthesize missing backs.
 */
function learnFrontToBackCameras(
  products: PrintifyProduct[],
): Map<number, number> {
  const pairs = new Map<number, number>();
  for (const product of products) {
    // Group by color variant so front/back of the same shirt line up.
    const byVariant = new Map<number, { front?: number; back?: number }>();
    for (const img of product.images ?? []) {
      const variantId = mockupUrlVariantId(img.src);
      const cameraId = mockupUrlCameraId(img.src);
      if (variantId == null || cameraId == null) continue;
      const entry = byVariant.get(variantId) ?? {};
      if (isFrontImage(img)) entry.front = cameraId;
      if (isBackImage(img)) entry.back = cameraId;
      byVariant.set(variantId, entry);
    }
    for (const { front, back } of byVariant.values()) {
      if (front != null && back != null) pairs.set(front, back);
    }
  }
  return pairs;
}

/**
 * Build a back mockup URL from a front URL + known camera pair.
 * Printify often serves backs on the CDN even when the API omits them.
 */
function synthesizeBackFromFront(
  front: PrintifyImage,
  frontToBackCamera: Map<number, number>,
): PrintifyImage | undefined {
  try {
    const frontCam = mockupUrlCameraId(front.src);
    if (frontCam == null) return undefined;
    const backCam = frontToBackCamera.get(frontCam) ?? frontCam + 1;
    const url = new URL(front.src);
    const parts = url.pathname.split("/");
    parts[4] = String(backCam);
    url.pathname = parts.join("/");
    url.searchParams.set("camera_label", "back");
    return {
      src: url.toString(),
      position: "back",
      is_default: false,
      variant_ids: front.variant_ids,
    };
  } catch {
    return undefined;
  }
}

/**
 * Prefer a back already tagged for this color; otherwise any back rewritten
 * to this color; otherwise synthesize from the front CDN URL.
 */
function resolveBackImage(
  coloredImages: PrintifyImage[],
  allImages: PrintifyImage[],
  front: PrintifyImage | undefined,
  frontToBackCamera: Map<number, number>,
): { image?: PrintifyImage; synthesized: boolean } {
  const coloredBack = pickBack(coloredImages);
  if (coloredBack) return { image: coloredBack, synthesized: false };

  const anyBack = pickBack(allImages);
  if (anyBack && front) {
    const variantId = mockupUrlVariantId(front.src);
    if (variantId != null) {
      return {
        image: {
          ...anyBack,
          src: rewriteMockupVariant(anyBack.src, variantId),
          is_default: false,
        },
        synthesized: true,
      };
    }
  }

  if (front) {
    const synthesized = synthesizeBackFromFront(front, frontToBackCamera);
    if (synthesized) return { image: synthesized, synthesized: true };
  }
  return { image: undefined, synthesized: false };
}

/**
 * Keep mockups whose URL variant id is one of the preferred color's variants.
 * If none exist (color never generated in the gallery), rewrite default
 * front/back URLs to the preferred variant so the CDN serves that color.
 */
function imagesForPreferredColor(
  images: PrintifyImage[],
  colorVariantIds: Set<number>,
  sampleVariantId: number | undefined,
): PrintifyImage[] {
  if (colorVariantIds.size === 0) return images;

  const matched = images.filter((img) => {
    const id = mockupUrlVariantId(img.src);
    return id != null && colorVariantIds.has(id);
  });
  if (matched.length > 0) return matched;

  if (sampleVariantId == null) return images;
  return images.map((img) => ({
    ...img,
    src: rewriteMockupVariant(img.src, sampleVariantId),
    is_default: false,
  }));
}

/**
 * Prefer any front mockup. Do not prefer is_default once a color is chosen —
 * the default flag almost always marks the white shirt.
 */
function pickFront(
  images: PrintifyImage[],
  preferDefault: boolean,
): PrintifyImage | undefined {
  const fronts = images.filter(isFrontImage);
  if (preferDefault) {
    return (
      fronts.find((i) => i.is_default) ??
      fronts[0] ??
      images.find((i) => i.is_default) ??
      images[0]
    );
  }
  return fronts[0] ?? images[0];
}

function pickBack(images: PrintifyImage[]): PrintifyImage | undefined {
  return images.find(isBackImage);
}

function pickPriceCents(variants: PrintifyVariant[] | undefined): number {
  const enabled = (variants ?? []).filter((v) => v.is_enabled !== false);
  const pool = enabled.length > 0 ? enabled : (variants ?? []);
  if (pool.length === 0) return 0;
  return Math.min(...pool.map((v) => v.price));
}

async function printifyFetch<T>(token: string, apiPath: string): Promise<T> {
  const res = await fetch(`${API_BASE}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "perfectshirts-sync",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Printify ${apiPath} → ${res.status}: ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

async function listAllProducts(
  token: string,
  shopId: string,
): Promise<PrintifyProduct[]> {
  const all: PrintifyProduct[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const batch = await printifyFetch<PrintifyProductList>(
      token,
      `/shops/${shopId}/products.json?limit=50&page=${page}`,
    );
    all.push(...batch.data);
    lastPage = batch.last_page ?? page;
    page += 1;
  } while (page <= lastPage);
  return all;
}

async function downloadImage(
  url: string,
  destPath: string,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

function escapeTsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const token = process.env.PRINTIFY_API_TOKEN?.trim();
  const listShops = process.argv.includes("--list-shops");
  const listColors = process.argv.includes("--list-colors");

  if (!token) {
    console.error(
      "Missing PRINTIFY_API_TOKEN. Copy .env.example to .env.local and add your token.",
    );
    process.exit(1);
  }

  if (listShops) {
    const shops = await printifyFetch<PrintifyShop[]>(token, "/shops.json");
    console.log("Your Printify shops:");
    for (const shop of shops) {
      console.log(`  id=${shop.id}  title=${shop.title}`);
    }
    return;
  }

  const shopId = process.env.PRINTIFY_SHOP_ID?.trim();
  if (!shopId) {
    console.error(
      "Missing PRINTIFY_SHOP_ID. Run: npm run sync:printify -- --list-shops",
    );
    process.exit(1);
  }

  console.log(`Fetching products for shop ${shopId}…`);
  const products = await listAllProducts(token, shopId);
  console.log(`Found ${products.length} product(s).`);

  if (listColors) {
    console.log("\nAvailable mockup colors (edit src/data/mockup-colors.ts):\n");
    const usedSlugs = new Set<string>();
    for (const product of products) {
      let slug = slugify(product.title) || `product-${product.id.slice(-6)}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${product.id.slice(-4)}`;
      usedSlugs.add(slug);
      const colors = listProductColors(product.variants);
      const preferred = mockupColors[slug];
      const pickNote = preferred ? `  → currently: "${preferred}"` : "";
      console.log(`  ${slug}`);
      console.log(`    ${product.title}`);
      console.log(`    colors: ${colors.join(", ") || "(none)"}${pickNote}`);
    }
    return;
  }

  fs.mkdirSync(SHIRTS_DIR, { recursive: true });

  // Some products omit backs from the API gallery but still serve them on the CDN.
  // Learn front→back camera ids from products that do list both.
  const frontToBackCamera = learnFrontToBackCameras(products);
  if (frontToBackCamera.size > 0) {
    console.log(
      `Learned ${frontToBackCamera.size} front→back camera pair(s) for CDN back synthesis.`,
    );
  }

  const usedSlugs = new Set<string>();
  const rows: {
    slug: string;
    printifyId: string;
    name: string;
    description: string;
    priceCents: number;
    imageSrc: string;
    imageBackSrc?: string;
    imageAlt: string;
  }[] = [];

  for (const product of products) {
    let slug = slugify(product.title) || `product-${product.id.slice(-6)}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${product.id.slice(-4)}`;
    }
    usedSlugs.add(slug);

    const preferredColor = mockupColors[slug];
    const { ids: colorIds, matchedColor, sampleId } = matchColorVariantIds(
      product.variants,
      preferredColor,
    );
    if (preferredColor && colorIds.size === 0) {
      const available = listProductColors(product.variants).join(", ");
      console.warn(
        `  warn (${product.title}): no color matching "${preferredColor}" — using default. Available: ${available || "(none)"}`,
      );
    }

    const allImages = product.images ?? [];
    const coloredImages = imagesForPreferredColor(
      allImages,
      colorIds,
      sampleId,
    );
    const usedColorPick = colorIds.size > 0 && coloredImages !== allImages;
    const front = pickFront(coloredImages, !usedColorPick);
    const { image: back, synthesized: backSynthesized } = resolveBackImage(
      coloredImages,
      allImages,
      front,
      frontToBackCamera,
    );
    const priceCents = pickPriceCents(product.variants);
    const colorLabel = matchedColor ? `, ${matchedColor}` : "";

    if (!front?.src) {
      console.warn(`  skip (no front image): ${product.title}`);
      continue;
    }
    if (!priceCents) {
      console.warn(`  warn (no price): ${product.title}`);
    }

    // Download raw mockup, then cut out the white studio backdrop → PNG.
    // Light pale fabrics need pure-white flood; saturated colors use the
    // gray-fringe flood so under-sleeve studio white clears cleanly.
    const cutMode =
      /white|cream|sky blue|powder blue|natural|blonde|pink|carolina/i.test(
        matchedColor ?? preferredColor ?? "",
      )
        ? "white"
        : "auto";
    const frontFile = `${slug}-front.png`;
    const frontPath = path.join(SHIRTS_DIR, frontFile);
    const frontTmp = path.join(SHIRTS_DIR, `${slug}-front.download`);
    await downloadImage(front.src, frontTmp);
    await cutoutShirt(frontTmp, frontPath, { mode: cutMode });
    fs.unlinkSync(frontTmp);

    let imageBackSrc: string | undefined;
    if (back?.src) {
      const backFile = `${slug}-back.png`;
      const backPath = path.join(SHIRTS_DIR, backFile);
      const backTmp = path.join(SHIRTS_DIR, `${slug}-back.download`);
      try {
        await downloadImage(back.src, backTmp);
        await cutoutShirt(backTmp, backPath, { mode: cutMode });
        fs.unlinkSync(backTmp);
        imageBackSrc = `/shirts/${backFile}`;
        const via = backSynthesized ? ", via CDN" : "";
        console.log(
          `  ✓ ${product.title} (front + back${via}${colorLabel}, $${(priceCents / 100).toFixed(2)})`,
        );
      } catch (err) {
        if (fs.existsSync(backTmp)) fs.unlinkSync(backTmp);
        console.warn(
          `  ✓ ${product.title} (front only${colorLabel} — back download failed, $${(priceCents / 100).toFixed(2)})`,
        );
        console.warn(`    ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      console.log(
        `  ✓ ${product.title} (front only${colorLabel} — no back mockup, $${(priceCents / 100).toFixed(2)})`,
      );
    }

    rows.push({
      slug,
      printifyId: product.id,
      name: product.title,
      description: "",
      priceCents,
      imageSrc: `/shirts/${frontFile}`,
      imageBackSrc,
      imageAlt: `${product.title} mockup`,
    });
  }

  const fileBody = `/**
 * AUTO-GENERATED by \`npm run sync:printify\` — do not edit by hand.
 * Re-run the sync after changing products in Printify.
 * Per-listing Etsy URLs live in etsy-urls.ts (applied at runtime too).
 */
import type { Product } from "./product-types";
import { ETSY_SHOP_URL } from "./product-types";
import { etsyUrls } from "./etsy-urls";

export type { Product } from "./product-types";
export { ETSY_SHOP_URL } from "./product-types";

export const products: Product[] = [
${rows
  .map((p) => {
    const backLine = p.imageBackSrc
      ? `\n    imageBackSrc: "${escapeTsString(p.imageBackSrc)}",`
      : "";
    const listing = etsyUrls[p.slug];
    const etsyExpr = listing
      ? `etsyUrls["${escapeTsString(p.slug)}"]`
      : "ETSY_SHOP_URL";
    return `  {
    slug: "${escapeTsString(p.slug)}",
    printifyId: "${escapeTsString(p.printifyId)}",
    name: "${escapeTsString(p.name)}",
    description: "${escapeTsString(p.description)}",
    priceCents: ${p.priceCents},
    imageSrc: "${escapeTsString(p.imageSrc)}",${backLine}
    imageAlt: "${escapeTsString(p.imageAlt)}",
    etsyUrl: ${etsyExpr},
    isPlaceholder: false,
  }`;
  })
  .join(",\n")}
];
`;

  fs.writeFileSync(PRODUCTS_OUT, fileBody, "utf8");
  console.log(`\nWrote ${rows.length} product(s) → src/data/products.ts`);
  console.log("Images saved under public/shirts/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
