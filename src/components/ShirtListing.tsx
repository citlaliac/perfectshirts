import Image from "next/image";
import type { Product } from "@/data/products";
import { formatPrice } from "@/lib/products";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";

type ShirtListingProps = {
  product: Product;
};

/** Basic bordered shirt block: photo, name, price, and Etsy handoff. */
export function ShirtListing({ product }: ShirtListingProps) {
  return (
    <article className="shirt-box" id={product.slug}>
      <h2 className="shirt-name">
        <a
          href={product.etsyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {product.name}
        </a>
      </h2>
      {product.isPlaceholder ? (
        <p className="placeholder-badge">PLACEHOLDER PRODUCT</p>
      ) : null}
      <a
        href={product.etsyUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Buy ${product.name} on Etsy`}
      >
        <Image
          className="shirt-photo"
          src={product.imageSrc}
          alt={product.imageAlt}
          width={320}
          height={360}
        />
      </a>
      <p className="shirt-price">
        <b>Price:</b> {formatPrice(product.priceCents)}
      </p>
      <BuyOnEtsyLink product={product} />
      {/* Keep for later — detail page still exists at /shirts/[slug]
      <p>
        <Link href={`/shirts/${product.slug}/`}>more info about this shirt</Link>
      </p>
      */}
    </article>
  );
}
