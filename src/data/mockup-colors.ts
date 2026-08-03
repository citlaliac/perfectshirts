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
  "copy-of-catholic-ecloud-fairy-worshiper-simple": "pink",
  "i-am-not-irish-do-not-touch-me": "kelly green",
};
