/**
 * Validates the product catalog before build/deploy.
 * Run with: npm run validate:products
 */
import assert from "node:assert/strict";
import { products } from "../src/data/products";
import {
  formatPrice,
  isValidEtsyListingUrl,
  validateProducts,
} from "../src/lib/products";

const errors = validateProducts(products);
assert.equal(errors.length, 0, errors.join("\n"));

for (const product of products) {
  assert.ok(isValidEtsyListingUrl(product.etsyUrl), product.slug);
  assert.match(formatPrice(product.priceCents), /^\$\d+\.\d{2}$/);
}

console.log(`Validated ${products.length} product(s). OK.`);
