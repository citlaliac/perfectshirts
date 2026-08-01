import type { Product } from "@/data/products";

type BuyOnEtsyLinkProps = {
  product: Product;
  className?: string;
};

/**
 * Opens the exact Etsy listing in a new tab after telling the buyer they leave this site.
 * Etsy remains the checkout source of truth for sizes, shipping, and payment.
 */
export function BuyOnEtsyLink({ product, className }: BuyOnEtsyLinkProps) {
  const label = product.isPlaceholder
    ? "Buy on Etsy (demo link — not live yet)"
    : "Buy on Etsy";

  return (
    <p className={className}>
      <a
        className="buy-link"
        href={product.etsyUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} for ${product.name}`}
      >
        {label}
      </a>
      <br />
      <span className="etsy-notice">
        (this opens Etsy in a new window so you can pick size and pay there)
      </span>
    </p>
  );
}
