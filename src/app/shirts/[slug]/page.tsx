import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";
import {
  formatPrice,
  getAllProducts,
  getProductBySlug,
} from "@/lib/products";

type ShirtPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ShirtPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "shirt not found — perfect t shirts" };
  }

  return {
    title: `${product.name} — perfect t shirts`,
    description: product.description,
  };
}

export default async function ShirtPage({ params }: ShirtPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <p>
        <Link href="/">← back to all shirts</Link>
      </p>

      <article className="shirt-detail">
        <h2 className="shirt-name">{product.name}</h2>
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
        <BuyOnEtsyLink product={product} />
      </article>
    </main>
  );
}
