import type { Product } from "@/data/product-types";

type BuyOnEtsyLinkProps = {
  product: Product;
  className?: string;
};

/** Opens the Etsy shop/listing in a new tab. */
export function BuyOnEtsyLink({ product, className }: BuyOnEtsyLinkProps) {
  const label = product.isPlaceholder
    ? "buy on etsy (demo link — not live yet)"
    : "buy on etsy";

  return (
    <a
      className={className ?? "buy-link"}
      href={product.etsyUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} for ${product.name}`}
    >
      {label}
    </a>
  );
}
