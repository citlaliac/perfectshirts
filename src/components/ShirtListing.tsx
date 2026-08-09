import Link from "next/link";
import type { Product } from "@/data/product-types";
import { formatPrice } from "@/lib/products";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";
import { ShirtPhoto } from "@/components/ShirtPhoto";

type ShirtListingProps = {
  product: Product;
};

/**
 * Legal-pad shirt block: name + photo open the detail page; Etsy stays a buy CTA.
 * Layout is sized so every card in the grid matches height.
 */
export function ShirtListing({ product }: ShirtListingProps) {
  const detailHref = `/shirts/${product.slug}/`;

  return (
    <article className="shirt-box" id={product.slug}>
      <h2 className="shirt-name">
        <Link href={detailHref}>{product.name}</Link>
      </h2>
      {product.isPlaceholder ? (
        <p className="placeholder-badge">PLACEHOLDER PRODUCT</p>
      ) : null}
      <ShirtPhoto
        name={product.name}
        frontSrc={product.imageSrc}
        backSrc={product.imageBackSrc}
        alt={product.imageAlt}
        detailHref={detailHref}
      />
      <div className="shirt-box-footer">
        <p className="shirt-price">
          <b>Price:</b> {formatPrice(product.priceCents)}
        </p>
        <BuyOnEtsyLink product={product} />
      </div>
    </article>
  );
}
