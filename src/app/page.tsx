import Image from "next/image";
import { ShirtListing } from "@/components/ShirtListing";
import { getAllProducts } from "@/lib/products";

export default function HomePage() {
  const shirts = getAllProducts();

  return (
    <main>
      <section className="welcome-box" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">hello!!!!!!</h2>
        <p>
          this is my first website. i sell t shirts. click a shirt. then click
          buy on etsy. then buy it on etsy.
        </p>
        <p>
          <Image
            src="/under-construction.svg"
            alt=""
            width={32}
            height={32}
            className="inline-icon"
          />{" "}
          under construction forever{" "}
          <Image
            src="/under-construction.svg"
            alt=""
            width={32}
            height={32}
            className="inline-icon"
          />
        </p>
      </section>

      <section id="shirts" aria-labelledby="shirts-heading">
        <h2 id="shirts-heading">the shirts!!!!!!!!!!!</h2>
        <p className="count-line">
          currently showing {shirts.length} shirt
          {shirts.length === 1 ? "" : "s"}:
        </p>
        <div className="shirt-list">
          {shirts.map((product) => (
            <ShirtListing key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
