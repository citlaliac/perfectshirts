import type { Product } from "@/data/product-types";
import { formatPrice } from "@/lib/products";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";
import { ShirtPhoto } from "@/components/ShirtPhoto";

type ShirtListingProps = {
  product: Product;
};

/**
 * Shirt card: photo (links to Etsy; hover/auto-flip for back) then
 * title underneath, with price + Buy on Etsy on one quiet line.
 */
export function ShirtListing({ product }: ShirtListingProps) {
  return (
    <article className="shirt-box" id={product.slug}>
      <ShirtPhoto
        name={product.name}
        frontSrc={product.imageSrc}
        backSrc={product.imageBackSrc}
        alt={product.imageAlt}
        etsyUrl={product.etsyUrl}
      />
      <h2 className="shirt-name">
        <a href={product.etsyUrl} target="_blank" rel="noopener noreferrer">
          {product.name}
        </a>
      </h2>
      <p className="shirt-meta">
        <span className="shirt-price">{formatPrice(product.priceCents)}</span>
        <span className="shirt-meta-sep" aria-hidden="true">
          ·
        </span>
        <BuyOnEtsyLink product={product} />
      </p>
    </article>
  );
}
