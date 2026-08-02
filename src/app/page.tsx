import { ShirtListing } from "@/components/ShirtListing";
import { getAllProducts } from "@/lib/products";

export default function HomePage() {
  const shirts = getAllProducts();

  return (
    <main>
      <section className="welcome-box" aria-labelledby="welcome-heading">
        {/* <h2 id="welcome-heading">hello</h2> */}
        <p>
          peruse here, then click 'buy on etsy' to buy it through my etsy.
        </p>
      </section>

      <section id="shirts" aria-labelledby="shirts-heading">
        <h2 id="shirts-heading">the shirts</h2>
        <div className="shirt-list">
          {shirts.map((product) => (
            <ShirtListing key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
