/**
 * Sync catalog from Printify: title, price, colors, cutouts, tags.
 *
 * ## Shirt intake flow (do this BEFORE a full sync)
 *
 * 1. Finish products in Printify (title, enabled colors, tags, mockups).
 *    Products set to Hidden in Printify are skipped and stay off the site.
 * 2. Run intake (read-only — does not write files):
 *      npm run intake:printify
 * 3. For each NEW shirt (and any missing a pick), choose a main listing color
 *    and add it to src/data/mockup-colors.ts.
 * 4. Optionally set display order in src/data/product-order.ts
 *    and Etsy listing URLs in src/data/etsy-urls.ts.
 * 5. Full sync (downloads mockups, cutouts, all colors, writes products.ts):
 *      npm run sync:printify
 * 6. Spot-check locally (npm run dev), then commit / push to deploy.
 *
 * Automated cutout + multi-color gallery happen in step 5.
 * Main color is the only hand pick required for a clean listing card.
 *
 * Options:
 *   npm run intake:printify
 *   npm run sync:printify -- --list-shops
 *   npm run sync:printify -- --list-colors
 *   npm run sync:printify
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockupColors } from "../src/data/mockup-colors";
import { etsyUrls } from "../src/data/etsy-urls";
import { products as existingProducts } from "../src/data/products";
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
  tags?: string[];
  /** ISO timestamp from Printify, e.g. "2026-08-01T12:00:00+00:00" */
  created_at?: string;
  images?: PrintifyImage[];
  variants?: PrintifyVariant[];
};

type SyncedColor = {
  name: string;
  frontSrc: string;
  backSrc?: string;
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

/** Size tokens that appear in Printify variant titles (not fabric colors). */
const VARIANT_SIZE_RE =
  /^(xxs|xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl|6xl|\d+xl)$/i;

/**
 * Color name from a Printify variant title.
 * Titles may be "Teal / L" or "L / Teal" depending on the blueprint —
 * prefer the segment that is not a clothing size.
 */
function variantColor(title: string | undefined): string {
  if (!title) return "";
  const parts = title
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return VARIANT_SIZE_RE.test(parts[0]) ? "" : parts[0];
  }
  const nonSize = parts.find((part) => !VARIANT_SIZE_RE.test(part));
  return nonSize ?? "";
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
 * Force a mockup URL onto the same color variant as the chosen front.
 * Prevents pink-front / white-back (and similar) mismatches.
 */
function alignMockupToFrontColor(
  image: PrintifyImage,
  front: PrintifyImage | undefined,
): { image: PrintifyImage; rewritten: boolean } {
  const frontVariantId = front ? mockupUrlVariantId(front.src) : undefined;
  if (frontVariantId == null) return { image, rewritten: false };
  const backVariantId = mockupUrlVariantId(image.src);
  if (backVariantId === frontVariantId) return { image, rewritten: false };
  return {
    image: {
      ...image,
      src: rewriteMockupVariant(image.src, frontVariantId),
      is_default: false,
    },
    rewritten: true,
  };
}

/**
 * Prefer a back already tagged for this color; otherwise any back rewritten
 * to the front's color; otherwise synthesize from the front CDN URL.
 * Always ends on the same variant id as `front`.
 */
function resolveBackImage(
  coloredImages: PrintifyImage[],
  allImages: PrintifyImage[],
  front: PrintifyImage | undefined,
  frontToBackCamera: Map<number, number>,
): { image?: PrintifyImage; synthesized: boolean } {
  const coloredBack = pickBack(coloredImages);
  if (coloredBack) {
    const { image, rewritten } = alignMockupToFrontColor(coloredBack, front);
    return { image, synthesized: rewritten };
  }

  const anyBack = pickBack(allImages);
  if (anyBack && front) {
    const { image, rewritten } = alignMockupToFrontColor(anyBack, front);
    return { image, synthesized: rewritten };
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
  // Printify rate-limits bursty syncs; back off and retry a few times.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(`${API_BASE}${apiPath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json;charset=utf-8",
        "User-Agent": "perfectshirts-sync",
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
    if (res.status === 429 && attempt < 5) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : 15_000 * (attempt + 1);
      console.warn(`  rate limited on ${apiPath}; waiting ${Math.round(waitMs / 1000)}s…`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    const body = await res.text();
    throw new Error(`Printify ${apiPath} → ${res.status}: ${body.slice(0, 400)}`);
  }
  throw new Error(`Printify ${apiPath} → rate limit retries exhausted`);
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
  const intake = process.argv.includes("--intake");

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

  if (listColors || intake) {
    const knownSlugs = new Set(existingProducts.map((p) => p.slug));
    const usedSlugs = new Set<string>();
    const rows: Array<{
      slug: string;
      title: string;
      colors: string[];
      tags: string[];
      preferred?: string;
      isNew: boolean;
      isHidden: boolean;
    }> = [];

    for (const product of products) {
      // Still list hidden for awareness, but don't treat them as intake work.
      let slug = slugify(product.title) || `product-${product.id.slice(-6)}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${product.id.slice(-4)}`;
      usedSlugs.add(slug);
      rows.push({
        slug,
        title: product.title,
        colors: listProductColors(product.variants),
        tags: product.tags ?? [],
        preferred: mockupColors[slug],
        isNew: !knownSlugs.has(slug),
        isHidden: product.visible === false,
      });
    }

    if (intake) {
      const visibleRows = rows.filter((r) => !r.isHidden);
      const newcomers = visibleRows.filter((r) => r.isNew);
      const needsColor = visibleRows.filter((r) => !r.preferred);
      const missingTags = visibleRows.filter((r) => r.tags.length === 0);
      const hidden = rows.filter((r) => r.isHidden);

      console.log("\n=== Shirt intake (read-only) ===\n");
      console.log(`In Printify: ${rows.length}`);
      console.log(`Visible (on-site candidates): ${visibleRows.length}`);
      console.log(`Hidden in Printify (excluded): ${hidden.length}`);
      console.log(`Already on site: ${visibleRows.length - newcomers.length}`);
      console.log(`NEW (not synced yet): ${newcomers.length}`);
      console.log(`Missing main color pick: ${needsColor.length}`);
      console.log(`Missing Printify tags: ${missingTags.length}`);

      const printRow = (r: (typeof rows)[number]) => {
        const colorNote = r.preferred
          ? `main: "${r.preferred}"`
          : "main: (pick in mockup-colors.ts)";
        console.log(`\n  ${r.slug}${r.isNew ? "  ★ NEW" : ""}`);
        console.log(`    ${r.title}`);
        console.log(`    colors: ${r.colors.join(", ") || "(none)"}`);
        console.log(`    ${colorNote}`);
        console.log(`    tags: ${r.tags.length ? r.tags.join(", ") : "(none)"}`);
      };

      if (hidden.length > 0) {
        console.log("\n--- Hidden in Printify (will not appear on site) ---");
        for (const r of hidden) {
          console.log(`  ${r.title}`);
        }
      }

      if (newcomers.length > 0) {
        console.log("\n--- NEW shirts (pick a main color for each) ---");
        for (const r of newcomers) printRow(r);
      }

      const existingNeedsColor = needsColor.filter((r) => !r.isNew);
      if (existingNeedsColor.length > 0) {
        console.log("\n--- Already on site, still need a main color ---");
        for (const r of existingNeedsColor) printRow(r);
      }

      console.log(`\nNext:
  1. Edit src/data/mockup-colors.ts with a main color per ★ NEW slug
  2. Optional: product-order.ts + etsy-urls.ts
  3. npm run sync:printify   ← cutouts + all colors + catalog write
`);
      return;
    }

    console.log("\nAvailable mockup colors (edit src/data/mockup-colors.ts):\n");
    for (const r of rows) {
      const pickNote = r.preferred ? `  → currently: "${r.preferred}"` : "";
      console.log(`  ${r.slug}`);
      console.log(`    ${r.title}`);
      console.log(`    colors: ${r.colors.join(", ") || "(none)"}${pickNote}`);
      if (r.tags.length > 0) {
        console.log(`    tags: ${r.tags.join(", ")}`);
      }
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
    colors: SyncedColor[];
    tags: string[];
    createdAt?: string;
  }[] = [];

  const cutModeForColor = (colorName: string) =>
    /white|cream|sky blue|powder blue|natural|blonde|carolina/i.test(colorName)
      ? ("white" as const)
      : ("auto" as const);

  const colorMatchesPreferred = (colorName: string, preferred?: string) => {
    if (!preferred) return false;
    const a = colorName.toLowerCase();
    const b = preferred.toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  };

  /** Download + cut one color into public/shirts (preferred uses legacy paths). */
  async function syncColorMockups(opts: {
    slug: string;
    colorName: string;
    useLegacyPaths: boolean;
    allImages: PrintifyImage[];
    variants: PrintifyVariant[] | undefined;
  }): Promise<SyncedColor | undefined> {
    const { slug, colorName, useLegacyPaths, allImages, variants } = opts;
    const { ids, matchedColor, sampleId } = matchColorVariantIds(
      variants,
      colorName === "Default" ? undefined : colorName,
    );
    const label = matchedColor ?? (colorName === "Default" ? "Default" : colorName);
    const coloredImages =
      ids.size > 0
        ? imagesForPreferredColor(allImages, ids, sampleId)
        : allImages;
    const usedColorPick = ids.size > 0 && coloredImages !== allImages;
    let front = pickFront(coloredImages, !usedColorPick);
    if (front && sampleId != null && mockupUrlVariantId(front.src) !== sampleId) {
      front = {
        ...front,
        src: rewriteMockupVariant(front.src, sampleId),
        is_default: false,
      };
    }
    if (!front?.src && colorName === "Default") {
      front = pickFront(allImages, true);
    }
    if (!front?.src) return undefined;

    const { image: back } = resolveBackImage(
      coloredImages,
      allImages,
      front,
      frontToBackCamera,
    );

    const colorSlug = slugify(label) || "color";
    const fileBase = useLegacyPaths ? slug : `${slug}--${colorSlug}`;
    const cutMode = cutModeForColor(label);
    const frontFile = `${fileBase}-front.png`;
    const frontPath = path.join(SHIRTS_DIR, frontFile);
    const frontTmp = path.join(SHIRTS_DIR, `${fileBase}-front.download`);
    await downloadImage(front.src, frontTmp);
    await cutoutShirt(frontTmp, frontPath, { mode: cutMode });
    fs.unlinkSync(frontTmp);

    let backSrc: string | undefined;
    if (back?.src) {
      const backFile = `${fileBase}-back.png`;
      const backPath = path.join(SHIRTS_DIR, backFile);
      const backTmp = path.join(SHIRTS_DIR, `${fileBase}-back.download`);
      try {
        await downloadImage(back.src, backTmp);
        await cutoutShirt(backTmp, backPath, { mode: cutMode });
        fs.unlinkSync(backTmp);
        backSrc = `/shirts/${backFile}`;
      } catch (err) {
        if (fs.existsSync(backTmp)) fs.unlinkSync(backTmp);
        console.warn(
          `    warn (${slug} / ${label}): back failed — ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { name: label, frontSrc: `/shirts/${frontFile}`, backSrc };
  }

  for (const product of products) {
    // Printify "Hidden" products (not Published / Unpublished) use visible: false.
    // Keep them off the storefront entirely.
    if (product.visible === false) {
      console.log(`  · skip hidden: ${product.title}`);
      continue;
    }

    let slug = slugify(product.title) || `product-${product.id.slice(-6)}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${product.id.slice(-4)}`;
    }
    usedSlugs.add(slug);

    const preferredColor = mockupColors[slug];
    const availableColors = listProductColors(product.variants);
    if (preferredColor && availableColors.length > 0) {
      const { ids } = matchColorVariantIds(product.variants, preferredColor);
      if (ids.size === 0) {
        console.warn(
          `  warn (${product.title}): no color matching "${preferredColor}" — using default. Available: ${availableColors.join(", ") || "(none)"}`,
        );
      }
    }

    const priceCents = pickPriceCents(product.variants);
    if (!priceCents) {
      console.warn(`  warn (no price): ${product.title}`);
    }

    const allImages = product.images ?? [];
    const orderedColors = [...availableColors].sort((a, b) => {
      const ap = colorMatchesPreferred(a, preferredColor);
      const bp = colorMatchesPreferred(b, preferredColor);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return a.localeCompare(b);
    });
    const colorsToSync =
      orderedColors.length > 0 ? orderedColors : ["Default"];

    const syncedColors: SyncedColor[] = [];
    let usedLegacy = false;
    for (const colorName of colorsToSync) {
      const useLegacyPaths =
        !usedLegacy &&
        (syncedColors.length === 0 ||
          colorMatchesPreferred(colorName, preferredColor));
      try {
        const synced = await syncColorMockups({
          slug,
          colorName,
          useLegacyPaths,
          allImages,
          variants: product.variants,
        });
        if (!synced) continue;
        // Skip duplicate color labels (can happen if titles parse oddly).
        if (syncedColors.some((c) => c.name.toLowerCase() === synced.name.toLowerCase())) {
          continue;
        }
        if (useLegacyPaths) usedLegacy = true;
        syncedColors.push(synced);
      } catch (err) {
        console.warn(
          `    warn (${slug} / ${colorName}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (syncedColors.length === 0) {
      console.warn(`  skip (no front image): ${product.title}`);
      continue;
    }

    // Preferred color first in the gallery when present.
    const prefIdx = preferredColor
      ? syncedColors.findIndex((c) => colorMatchesPreferred(c.name, preferredColor))
      : 0;
    if (prefIdx > 0) {
      const [pref] = syncedColors.splice(prefIdx, 1);
      syncedColors.unshift(pref);
    }

    const listing = syncedColors[0];
    console.log(
      `  ✓ ${product.title} (${listing.backSrc ? "front + back" : "front only"}, ${syncedColors.length} color(s), $${(priceCents / 100).toFixed(2)})`,
    );

    // Normalize tags for stable filtering (trim, drop empties, de-dupe).
    const tags = [
      ...new Set(
        (product.tags ?? [])
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ];

    rows.push({
      slug,
      printifyId: product.id,
      name: product.title,
      description: "",
      priceCents,
      imageSrc: listing.frontSrc,
      imageBackSrc: listing.backSrc,
      imageAlt: `${product.title} mockup`,
      colors: syncedColors,
      tags,
      createdAt: product.created_at,
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
    const colorsBlock = p.colors
      .map((c) => {
        const cBack = c.backSrc
          ? `,\n        backSrc: "${escapeTsString(c.backSrc)}"`
          : "";
        return `      {
        name: "${escapeTsString(c.name)}",
        frontSrc: "${escapeTsString(c.frontSrc)}"${cBack}
      }`;
      })
      .join(",\n");
    const tagsBlock =
      p.tags.length > 0
        ? `\n    tags: [${p.tags.map((t) => `"${escapeTsString(t)}"`).join(", ")}],`
        : "";
    const createdBlock = p.createdAt
      ? `\n    createdAt: "${escapeTsString(p.createdAt)}",`
      : "";
    return `  {
    slug: "${escapeTsString(p.slug)}",
    printifyId: "${escapeTsString(p.printifyId)}",
    name: "${escapeTsString(p.name)}",
    description: "${escapeTsString(p.description)}",
    priceCents: ${p.priceCents},
    imageSrc: "${escapeTsString(p.imageSrc)}",${backLine}
    imageAlt: "${escapeTsString(p.imageAlt)}",
    colors: [
${colorsBlock}
    ],${tagsBlock}${createdBlock}
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
