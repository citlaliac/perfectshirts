import type { Product } from "@/data/product-types";
import { formatPrice } from "@/lib/products";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";
import { ShirtPhoto } from "@/components/ShirtPhoto";

type ShirtListingProps = {
  product: Product;
};

/**
 * Legal-pad shirt block: name, photo (hover / mobile flip), price, Etsy.
 */
export function ShirtListing({ product }: ShirtListingProps) {
  return (
    <article className="shirt-box" id={product.slug}>
      <h2 className="shirt-name">
        <a href={product.etsyUrl} target="_blank" rel="noopener noreferrer">
          {product.name}
        </a>
      </h2>
      {product.isPlaceholder ? (
        <p className="placeholder-badge">PLACEHOLDER PRODUCT</p>
      ) : null}
      <ShirtPhoto
        name={product.name}
        frontSrc={product.imageSrc}
        backSrc={product.imageBackSrc}
        alt={product.imageAlt}
        etsyUrl={product.etsyUrl}
      />
      <p className="shirt-price">
        <b>Price:</b> {formatPrice(product.priceCents)}
      </p>
      <BuyOnEtsyLink product={product} />
    </article>
  );
}
