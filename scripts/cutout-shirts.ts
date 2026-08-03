/**
 * Cut white studio backdrops out of existing mockups in public/shirts/
 * and rewrite products.ts paths to the resulting PNGs.
 *
 * Prefer `npm run sync:printify` for a full refresh (downloads + cutout).
 * Usage: npm run cutout:shirts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cutoutShirt } from "./lib/cutout-shirt";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHIRTS_DIR = path.join(ROOT, "public", "shirts");
const PRODUCTS_FILE = path.join(ROOT, "src", "data", "products.ts");

async function main() {
  const files = fs
    .readdirSync(SHIRTS_DIR)
    .filter((name) => /-(front|back)\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  if (files.length === 0) {
    console.error("No front/back mockups found in public/shirts/");
    process.exit(1);
  }

  for (const name of files) {
    const input = path.join(SHIRTS_DIR, name);
    const outputName = name.replace(/\.(jpe?g|png|webp)$/i, ".png");
    const output = path.join(SHIRTS_DIR, outputName);
    process.stdout.write(`  cutting ${name}… `);
    await cutoutShirt(input, output);
    if (path.resolve(input) !== path.resolve(output)) {
      fs.unlinkSync(input);
    }
    console.log("ok");
  }

  // Point the catalog at the PNG cutouts.
  let products = fs.readFileSync(PRODUCTS_FILE, "utf8");
  products = products.replace(
    /(\/shirts\/[a-z0-9-]+-(?:front|back))\.(?:jpe?g|webp)/gi,
    "$1.png",
  );
  fs.writeFileSync(PRODUCTS_FILE, products, "utf8");
  console.log(`\nUpdated paths in src/data/products.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
