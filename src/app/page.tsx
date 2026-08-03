import { ShirtListing } from "@/components/ShirtListing";
import { getAllProducts } from "@/lib/products";

/** Minimal home: just the shirt grid. */
export default function HomePage() {
  const shirts = getAllProducts();

  return (
    <main>
      <section id="shirts" aria-label="Shirts">
        <div className="shirt-list">
          {shirts.map((product) => (
            <ShirtListing key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
