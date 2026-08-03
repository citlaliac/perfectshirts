/**
 * Remove the solid studio backdrop from a Printify mockup and trim
 * tightly to the shirt silhouette. Output is a transparent PNG.
 *
 * Uses edge flood-fill (Printify backdrops are near-white and connected
 * to the frame). Softens the cut edge so anti-alias fringing disappears.
 * White shirts use a dedicated "pure studio white" detector so fabric
 * texture isn't mistaken for background.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Rgba = { r: number; g: number; b: number };

type CutParams = {
  floodThreshold: number;
  fringePasses: number;
  fringeThreshold: number;
  /** When true, only near-pure white counts as backdrop (white tees). */
  pureWhiteOnly: boolean;
};

export type CutoutOptions = {
  /** Force the white-shirt path (stricter pure-white flood). */
  mode?: "auto" | "white" | "color";
};

/** Default: works for colored shirts on a white studio backdrop. */
const COLOR_PARAMS: CutParams = {
  floodThreshold: 16,
  fringePasses: 5,
  fringeThreshold: 36,
  pureWhiteOnly: false,
};

/**
 * White tee path: studio backdrops are ~#FFFFFF with almost no chroma.
 * Shirt yarn is slightly darker / textured, so pure-white detection
 * clears the void (including under sleeves) without eating the body.
 */
const WHITE_PARAMS: CutParams = {
  floodThreshold: 10,
  fringePasses: 8,
  fringeThreshold: 20,
  pureWhiteOnly: true,
};

function dist(a: Rgba, b: Rgba): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luminance(pixel: Rgba): number {
  return (pixel.r + pixel.g + pixel.b) / 3;
}

function readPixel(data: Buffer, width: number, x: number, y: number): Rgba {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function sampleBackdrop(data: Buffer, width: number, height: number): Rgba {
  const corners: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let br = 0;
  let bg = 0;
  let bb = 0;
  for (const [x, y] of corners) {
    const c = readPixel(data, width, x, y);
    br += c.r;
    bg += c.g;
    bb += c.b;
  }
  return {
    r: br / corners.length,
    g: bg / corners.length,
    b: bb / corners.length,
  };
}

/**
 * Printify studio white is nearly pure #FFF. Fabric white has lower min
 * channel and/or more RGB spread from texture and soft shadows.
 */
function isPureStudioWhite(pixel: Rgba, backdrop: Rgba): boolean {
  const min = Math.min(pixel.r, pixel.g, pixel.b);
  const max = Math.max(pixel.r, pixel.g, pixel.b);
  const nearBackdrop = dist(pixel, backdrop) < 10;
  const nearPure = min >= 249 && max - min <= 3;
  return nearBackdrop || nearPure;
}

/** Run flood-fill + fringe nibble; mutates `pixels` alpha in place. */
function clearBackdrop(
  pixels: Buffer,
  width: number,
  height: number,
  backdrop: Rgba,
  params: CutParams,
): number {
  const cleared = new Uint8Array(width * height);
  const isBackdrop = (x: number, y: number, threshold: number): boolean => {
    const pixel = readPixel(pixels, width, x, y);
    if (params.pureWhiteOnly) {
      return isPureStudioWhite(pixel, backdrop);
    }
    if (dist(pixel, backdrop) < threshold) return true;
    // Under-sleeve / anti-alias studio fill is light gray, not dyed fabric.
    const max = Math.max(pixel.r, pixel.g, pixel.b);
    const min = Math.min(pixel.r, pixel.g, pixel.b);
    return max >= 195 && max - min <= 45;
  };

  const stack: number[] = [];
  const tryPush = (x: number, y: number, threshold: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (cleared[idx]) return;
    if (!isBackdrop(x, y, threshold)) return;
    cleared[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0, params.floodThreshold);
    tryPush(x, height - 1, params.floodThreshold);
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y, params.floodThreshold);
    tryPush(width - 1, y, params.floodThreshold);
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;
    tryPush(x - 1, y, params.floodThreshold);
    tryPush(x + 1, y, params.floodThreshold);
    tryPush(x, y - 1, params.floodThreshold);
    tryPush(x, y + 1, params.floodThreshold);
  }

  for (let pass = 0; pass < params.fringePasses; pass += 1) {
    const toClear: number[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        if (cleared[idx]) continue;
        if (!isBackdrop(x, y, params.fringeThreshold)) continue;
        const touchesClear =
          (x > 0 && cleared[idx - 1]) ||
          (x < width - 1 && cleared[idx + 1]) ||
          (y > 0 && cleared[idx - width]) ||
          (y < height - 1 && cleared[idx + width]);
        if (touchesClear) toClear.push(idx);
      }
    }
    for (const idx of toClear) cleared[idx] = 1;
  }

  // Extra nibbles: eat bright studio fringe next to already-cleared pixels
  // (kills the chalky white halo without soft semi-transparent white edges).
  for (let pass = 0; pass < 5; pass += 1) {
    const toClear: number[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        if (cleared[idx]) continue;
        const pixel = readPixel(pixels, width, x, y);
        const max = Math.max(pixel.r, pixel.g, pixel.b);
        const min = Math.min(pixel.r, pixel.g, pixel.b);
        // Studio anti-alias is bright + low-chroma (white/gray), not dyed fabric.
        const brightFringe =
          (max >= 170 && max - min <= 50) || dist(pixel, backdrop) < 30;
        if (!brightFringe) continue;
        const touchesClear =
          (x > 0 && cleared[idx - 1]) ||
          (x < width - 1 && cleared[idx + 1]) ||
          (y > 0 && cleared[idx - width]) ||
          (y < height - 1 && cleared[idx + width]);
        if (touchesClear) toClear.push(idx);
      }
    }
    for (const idx of toClear) cleared[idx] = 1;
  }

  // Hard cut — no semi-transparent white glow (that reads as a backdrop).
  let opaque = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const i = idx * 4;
      if (cleared[idx]) {
        pixels[i + 3] = 0;
        continue;
      }
      opaque += 1;
      pixels[i + 3] = 255;
    }
  }
  return opaque / (width * height);
}

/**
 * Scrub chalky white halo from an already-cut transparent PNG.
 * Safe to run on finished mockups without re-downloading.
 */
export async function scrubWhiteHalo(
  inputPath: string,
  outputPath: string = inputPath,
): Promise<string> {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const pixels = Buffer.from(data);
  const cleared = new Uint8Array(width * height);

  const isTransparentOrWhiteFringe = (x: number, y: number): boolean => {
    const i = (y * width + x) * 4;
    const a = pixels[i + 3];
    if (a < 16) return true;
    const pixel = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
    const min = Math.min(pixel.r, pixel.g, pixel.b);
    const max = Math.max(pixel.r, pixel.g, pixel.b);
    // Semi-transparent near-white = classic cutout halo (not cream fabric)
    if (a < 250 && min >= 245 && max - min <= 8) return true;
    return false;
  };

  const stack: number[] = [];
  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (cleared[idx]) return;
    if (!isTransparentOrWhiteFringe(x, y)) return;
    cleared[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  // Nibble bright low-chroma fringe (white/gray anti-alias) stuck to the void.
  for (let pass = 0; pass < 8; pass += 1) {
    const toClear: number[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        if (cleared[idx]) continue;
        const i = idx * 4;
        const pixel = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
        const max = Math.max(pixel.r, pixel.g, pixel.b);
        const min = Math.min(pixel.r, pixel.g, pixel.b);
        if (max < 165 || max - min > 55) continue;
        const touchesClear =
          (x > 0 && cleared[idx - 1]) ||
          (x < width - 1 && cleared[idx + 1]) ||
          (y > 0 && cleared[idx - width]) ||
          (y < height - 1 && cleared[idx + width]);
        if (touchesClear) toClear.push(idx);
      }
    }
    for (const idx of toClear) cleared[idx] = 1;
  }

  for (let idx = 0; idx < cleared.length; idx += 1) {
    if (cleared[idx]) pixels[idx * 4 + 3] = 0;
    else if (pixels[idx * 4 + 3] > 0) pixels[idx * 4 + 3] = 255;
  }

  const tmp = `${outputPath}.scrub.png`;
  const scrubbed = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const trimmed = await sharp(scrubbed).trim({ threshold: 8 }).png().toBuffer();
  await sharp(trimmed)
    .resize({
      width: MOCKUP_CANVAS.width,
      height: MOCKUP_CANVAS.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, outputPath);
  return outputPath;
}

function pickParams(
  mode: CutoutOptions["mode"],
  firstPassRatio: number,
): CutParams {
  if (mode === "white") return WHITE_PARAMS;
  if (mode === "color") return COLOR_PARAMS;
  // auto: if the color pass ate the shirt, caller retries white
  if (firstPassRatio < 0.2) return WHITE_PARAMS;
  return COLOR_PARAMS;
}

/**
 * Shared mockup canvas so every shirt reads the same size on the site.
 * Shirt is fit inside with transparent padding (never cropped).
 */
export const MOCKUP_CANVAS = { width: 1000, height: 1100 } as const;

/**
 * Center a transparent PNG on the shared canvas for consistent card scale.
 */
export async function normalizeMockupCanvas(
  inputPath: string,
  outputPath: string = inputPath,
): Promise<string> {
  // Always write via temp — sharp cannot safely overwrite its own input.
  const tmp = `${outputPath}.tmp.png`;
  await sharp(inputPath)
    .ensureAlpha()
    .resize({
      width: MOCKUP_CANVAS.width,
      height: MOCKUP_CANVAS.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, outputPath);
  return outputPath;
}

/**
 * Cut the shirt out of `inputPath` and write a trimmed transparent PNG
 * to `outputPath`. Returns the output path.
 */
export async function cutoutShirt(
  inputPath: string,
  outputPath: string,
  options: CutoutOptions = {},
): Promise<string> {
  const mode = options.mode ?? "auto";
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const backdrop = sampleBackdrop(data, width, height);

  let pixels = Buffer.from(data);
  let params =
    mode === "white"
      ? WHITE_PARAMS
      : mode === "color"
        ? COLOR_PARAMS
        : COLOR_PARAMS;

  let opaqueRatio = clearBackdrop(pixels, width, height, backdrop, params);

  // Auto: colored pass over-ate a light shirt → retry white-safe params.
  if (mode === "auto" && opaqueRatio < 0.2) {
    pixels = Buffer.from(data);
    params = pickParams("white", opaqueRatio);
    opaqueRatio = clearBackdrop(pixels, width, height, backdrop, params);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const cut = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  // Trim tight, then pad onto the shared canvas so every tee matches size.
  const trimmed = await sharp(cut).trim({ threshold: 8 }).png().toBuffer();
  await sharp(trimmed)
    .resize({
      width: MOCKUP_CANVAS.width,
      height: MOCKUP_CANVAS.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outputPath);

  // Second pass: strip any leftover chalky halo on the finished PNG.
  await scrubWhiteHalo(outputPath);
  return outputPath;
}
