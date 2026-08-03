/**
 * Pad existing cutout PNGs onto the shared mockup canvas so every tee
 * renders at the same visual size (no re-download / re-cut needed).
 *
 * Usage: npx tsx scripts/normalize-shirt-canvas.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeMockupCanvas } from "./lib/cutout-shirt";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHIRTS_DIR = path.join(ROOT, "public", "shirts");

async function main() {
  const files = fs
    .readdirSync(SHIRTS_DIR)
    .filter((name) => /-(front|back)\.png$/i.test(name))
    .sort();

  for (const name of files) {
    const filePath = path.join(SHIRTS_DIR, name);
    process.stdout.write(`  normalize ${name}… `);
    await normalizeMockupCanvas(filePath);
    console.log("ok");
  }
  console.log(`\nNormalized ${files.length} mockup(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
