import { ShirtCatalog } from "@/components/ShirtCatalog";
import { getAllProducts, getTagOptions } from "@/lib/products";

/** Legal-pad home: welcome blurb + sortable / filterable shirt grid. */
export default function HomePage() {
  const shirts = getAllProducts();
  const tagOptions = getTagOptions(shirts);

  return (
    <main>
      <section className="welcome-box" aria-labelledby="welcome-heading">
        <p id="welcome-heading">
          click a shirt for a bigger look, then buy on etsy.
        </p>
      </section>

      <section id="shirts" aria-labelledby="shirts-heading">
        <ShirtCatalog products={shirts} tagOptions={tagOptions} />
      </section>
    </main>
  );
}
