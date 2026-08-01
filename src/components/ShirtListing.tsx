import Image from "next/image";
import Link from "next/link";
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
        <Link href={`/shirts/${product.slug}/`}>{product.name}</Link>
      </h2>
      {product.isPlaceholder ? (
        <p className="placeholder-badge">PLACEHOLDER PRODUCT</p>
      ) : null}
      <Image
        className="shirt-photo"
        src={product.imageSrc}
        alt={product.imageAlt}
        width={320}
        height={360}
      />
      <p className="shirt-price">
        <b>Price:</b> {formatPrice(product.priceCents)}
      </p>
      <p className="shirt-meta">
        <b>Sizes:</b> {product.sizesSummary}
        <br />
        <b>Colors:</b> {product.colorsSummary}
      </p>
      <p className="shirt-description">{product.description}</p>
      <BuyOnEtsyLink product={product} />
      <p>
        <Link href={`/shirts/${product.slug}/`}>more info about this shirt</Link>
      </p>
    </article>
  );
}
