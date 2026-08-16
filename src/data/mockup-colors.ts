/**
 * Preferred shirt color for site mockups, keyed by product slug.
 *
 * Values are matched (case-insensitive) against the color part of
 * Printify variant titles (e.g. "Teal / L" → "Teal").
 *
 * Edit this file, then run: npm run sync:printify
 * See available colors: npm run sync:printify -- --list-colors
 */
export const mockupColors: Record<string, string> = {
  // No "Teal" on this Printify product — Powder Blue is the closest available.
  "cute-alan-greenspan-tee": "powder blue",
  "cute-oil-giant-tee": "cream",
  "beautiful-wife-tee": "navy",
  "business-casual-tee": "white",
  "business-casualty": "black",
  "hypno-crime": "powder blue",

  "pope-of-the-catholic-ecloud": "navy",
  // "light blue" → Printify label is Sky Blue
  "premium-catholic-ecloud-lamb-worshiper": "sky blue",
  "premium-catholic-ecloud-frog-worshiper": "safety green",
  "premium-catholic-ecloud-fairyworhsiper": "pink",
  // "cream" → closest Printify label is Natural
  "catholic-ecloud-frog-worshiper-simple": "natural",
  "catholic-ecloud-lamb-worshiper-simple": "natural",
  "catholic-ecloud-fairy-worshiper-simple": "pink",
  "i-am-not-irish-do-not-touch-me": "kelly green",

  // Newer listings
  "artistic-meat-for-the-capitalist-machine": "burgundy",
  "all-i-got-was-this-perfect-shirt": "white",
  "purrrfect-shirts": "blonde",
  "beach-day-tee": "white",
  "pink-flowers-shirt": "purple",
  "amazing-melons": "blonde",
  "subtle-pope-cec-shirt": "navy",
  "the-candy-man-must": "blonde",
  "food-spilling-shirt": "black",

  // 2026-08 intake
  "pumpkin-balloon-halloween-large-design": "white",
  "pumpkin-balloon-halloween-shirt-small-logo": "orange",
  "sun-moon-on-horseback": "white",
  "beetle-tee-long-distressed": "peach",
  "cute-eyes-long-distressed-tee": "mustard",
  "saturn-eyes-long-distressed-tee": "washed denim",
  "pope-cec-shirt-smaller-logo": "burgundy",

  "pumpkin-peeps": "black",
  "16th-century-sun-tee": "black",
  // Blonde no longer on this Printify product — White is the clean listing stand-in.
  "british-creed": "white",
  "girl-meat-for-the-capitalist-machine": "burgundy",
  "tepeyollotl-tee": "khaki",
  "sun-moon-city": "sky blue",
  "catholic-ecloud-chest-logo-frog": "pink",

  // 2026-08 women's / boxy intake (match unisex picks when the color exists)
  "cute-alan-greenspan-tee-womens": "teal",
  "cute-oil-giant-tee-womens": "pink",
  "hypno-crime-womens": "dark lavender",
  "all-i-got-was-this-perfect-shirt-boxy-tee": "ivory",
  "british-creed-women": "natural",
  "small-logo-pumpkin-balloon-halloween-shirt-womens": "white",
  "meat-for-the-capitalist-machine-womens": "black",
  "sun-moon-on-horseback-womens": "white",
  "sun-moon-city-boxy-tee": "ivory",
  "i-am-not-irish-do-not-touch-me-boxy-tee": "irish green",
  "catholic-e-cloud-boxy-tee": "black",
  "beautiful-wife-tee-womens": "navy",
};
