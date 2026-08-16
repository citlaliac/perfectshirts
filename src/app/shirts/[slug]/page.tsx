import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyOnEtsyLink } from "@/components/BuyOnEtsyLink";
import { ShirtDetailGallery } from "@/components/ShirtDetailGallery";
import {
  formatPrice,
  getAllProducts,
  getProductBySlug,
  getProductColors,
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

/** Bigger shirt page: swipe colors / front-back, then buy on Etsy. */
export default async function ShirtPage({ params }: ShirtPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const colors = getProductColors(product);

  return (
    <main>
      <p>
        <Link href="/">← back to all shirts</Link>
      </p>

      <article className="shirt-detail">
        <h2 className="shirt-name">{product.name}</h2>
        <ShirtDetailGallery name={product.name} colors={colors} />
        <p className="shirt-price">
          <b>Price:</b> {formatPrice(product.priceCents)}
        </p>
        <BuyOnEtsyLink product={product} />
      </article>
    </main>
  );
}
