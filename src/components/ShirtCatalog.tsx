"use client";

import { useMemo, useState } from "react";
import { ShirtListing } from "@/components/ShirtListing";
import type { Product } from "@/data/product-types";
import {
  type CatalogSort,
  type TagOption,
  productHasTag,
  sortProducts,
} from "@/lib/products";

type ShirtCatalogProps = {
  products: Product[];
  tagOptions: TagOption[];
};

/**
 * Client catalog controls: sort + tag filter over the static product list.
 * Controls sit on the same row as the section heading.
 */
export function ShirtCatalog({ products, tagOptions }: ShirtCatalogProps) {
  const [sort, setSort] = useState<CatalogSort>("default");
  const [tagKey, setTagKey] = useState("");

  const visible = useMemo(() => {
    const filtered = tagKey
      ? products.filter((p) => productHasTag(p, tagKey))
      : products;
    return sortProducts(filtered, sort);
  }, [products, sort, tagKey]);

  return (
    <div className="shirt-catalog">
      <div className="catalog-toolbar">
        <h2 id="shirts-heading" className="catalog-heading">
          the shirts
        </h2>
        <div
          className="catalog-controls"
          role="group"
          aria-label="Sort and filter shirts"
        >
          <label className="catalog-control">
            <span className="catalog-control-label">sort</span>
            <select
              className="catalog-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as CatalogSort)}
            >
              <option value="default">default order</option>
              <option value="newest">newest</option>
              <option value="alpha">alphabetical</option>
              <option value="price-asc">price: low to high</option>
              <option value="price-desc">price: high to low</option>
            </select>
          </label>

          <label className="catalog-control">
            <span className="catalog-control-label">tag</span>
            <select
              className="catalog-select"
              value={tagKey}
              onChange={(e) => setTagKey(e.target.value)}
            >
              <option value="">all tags</option>
              {tagOptions.map((tag) => (
                <option key={tag.key} value={tag.key}>
                  {tag.label} ({tag.count})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="catalog-count" aria-live="polite">
        showing {visible.length} of {products.length}
      </p>

      {visible.length === 0 ? (
        <p className="catalog-empty">no shirts match that tag.</p>
      ) : (
        <div className="shirt-list">
          {visible.map((product) => (
            <ShirtListing key={product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
