"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductColor } from "@/data/product-types";

type ShirtDetailGalleryProps = {
  name: string;
  colors: ProductColor[];
};

type Slide = {
  colorName: string;
  side: "front" | "back";
  src: string;
};

/**
 * Large detail gallery: swipe (or buttons) through colors and front/back.
 * Color chips jump to that color's front view.
 */
export function ShirtDetailGallery({ name, colors }: ShirtDetailGalleryProps) {
  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [];
    for (const color of colors) {
      list.push({
        colorName: color.name,
        side: "front",
        src: color.frontSrc,
      });
      if (color.backSrc) {
        list.push({
          colorName: color.name,
          side: "back",
          src: color.backSrc,
        });
      }
    }
    return list;
  }, [colors]);

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const current = slides[index] ?? slides[0];

  // Keep index in range if the color list changes.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  const go = (next: number) => {
    if (slides.length === 0) return;
    const wrapped = ((next % slides.length) + slides.length) % slides.length;
    setIndex(wrapped);
  };

  const jumpToColor = (colorName: string) => {
    const frontIdx = slides.findIndex(
      (s) => s.colorName === colorName && s.side === "front",
    );
    if (frontIdx >= 0) setIndex(frontIdx);
  };

  if (!current) return null;

  const showColorChips = colors.length > 1;
  const hasMultipleSlides = slides.length > 1;

  return (
    <div className="detail-gallery">
      <div
        className="detail-gallery-stage"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null || !hasMultipleSlides) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 40) return;
          go(index + (delta < 0 ? 1 : -1));
        }}
      >
        <Image
          className="detail-gallery-image"
          src={current.src}
          alt={`${name} — ${current.colorName} ${current.side}`}
          fill
          sizes="(max-width: 699px) 100vw, 640px"
          priority
        />

        {hasMultipleSlides ? (
          <>
            <button
              type="button"
              className="detail-gallery-nav detail-gallery-prev"
              aria-label="Previous view"
              onClick={() => go(index - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="detail-gallery-nav detail-gallery-next"
              aria-label="Next view"
              onClick={() => go(index + 1)}
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      <p className="detail-gallery-caption" aria-live="polite">
        {current.colorName === "Default" ? current.side : `${current.colorName} · ${current.side}`}
        {hasMultipleSlides ? (
          <span className="detail-gallery-count">
            {" "}
            ({index + 1}/{slides.length})
          </span>
        ) : null}
      </p>

      {hasMultipleSlides ? (
        <div className="detail-gallery-dots" role="tablist" aria-label="Views">
          {slides.map((slide, i) => (
            <button
              key={`${slide.colorName}-${slide.side}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${slide.colorName} ${slide.side}`}
              className={`detail-gallery-dot${i === index ? " is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}

      <div className="detail-gallery-sides">
        <button
          type="button"
          className={`detail-side-btn${current.side === "front" ? " is-active" : ""}`}
          disabled={!slides.some((s) => s.colorName === current.colorName && s.side === "front")}
          onClick={() => {
            const i = slides.findIndex(
              (s) => s.colorName === current.colorName && s.side === "front",
            );
            if (i >= 0) setIndex(i);
          }}
        >
          front
        </button>
        <button
          type="button"
          className={`detail-side-btn${current.side === "back" ? " is-active" : ""}`}
          disabled={!slides.some((s) => s.colorName === current.colorName && s.side === "back")}
          onClick={() => {
            const i = slides.findIndex(
              (s) => s.colorName === current.colorName && s.side === "back",
            );
            if (i >= 0) setIndex(i);
          }}
        >
          back
        </button>
      </div>

      {showColorChips ? (
        <div className="detail-color-chips" role="list" aria-label="Shirt colors">
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              role="listitem"
              className={`detail-color-chip${
                color.name === current.colorName ? " is-active" : ""
              }`}
              onClick={() => jumpToColor(color.name)}
            >
              {color.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
