import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";
import { ShirtPhoto } from "@/components/ShirtPhoto";
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
    return { title: "shirt not found — perfect shirts" };
  }

  return {
    title: `${product.name} — perfect shirts`,
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
    </main>
  );
}
