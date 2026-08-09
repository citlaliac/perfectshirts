"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type ShirtPhotoProps = {
  name: string;
  frontSrc: string;
  backSrc?: string;
  alt: string;
  /** Opens the shirt detail page (bigger gallery). */
  detailHref: string;
};

/** Mobile listing flip: front longer, back a quick peek, then repeat. */
const MOBILE_FRONT_MS = 4_000;
const MOBILE_BACK_MS = 2_000;

/**
 * Listing card photo → detail page on click.
 * Desktop (mouse): hover shows the back.
 * Mobile / touch: front 4s → back 2s → front 4s… (always starts on front).
 */
export function ShirtPhoto({
  name,
  frontSrc,
  backSrc,
  alt,
  detailHref,
}: ShirtPhotoProps) {
  const [showBack, setShowBack] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);
  const hasBack = Boolean(backSrc);

  // Phones, narrow viewports, and touch-first devices all auto-flip.
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 699px)");
    const touch = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => {
      setAutoFlip(narrow.matches || touch.matches);
    };
    sync();
    narrow.addEventListener("change", sync);
    touch.addEventListener("change", sync);
    return () => {
      narrow.removeEventListener("change", sync);
      touch.removeEventListener("change", sync);
    };
  }, []);

  // Always begin on the front, then alternate with unequal dwell times.
  useEffect(() => {
    if (!hasBack || !autoFlip) {
      setShowBack(false);
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    setShowBack(false);

    const schedule = (showingBack: boolean) => {
      const delay = showingBack ? MOBILE_BACK_MS : MOBILE_FRONT_MS;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const next = !showingBack;
        setShowBack(next);
        schedule(next);
      }, delay);
    };

    schedule(false);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [hasBack, autoFlip]);

  return (
    <Link
      className={`shirt-photo-link${showBack && hasBack ? " is-showing-back" : ""}`}
      href={detailHref}
      aria-label={`View ${name} details`}
      onMouseEnter={() => {
        if (hasBack && !autoFlip) setShowBack(true);
      }}
      onMouseLeave={() => {
        if (!autoFlip) setShowBack(false);
      }}
    >
      {/* Both sides stay mounted; opacity swap is more reliable than src changes. */}
      <Image
        className={`shirt-photo shirt-photo-front${showBack && hasBack ? "" : " is-active"}`}
        src={frontSrc}
        alt={alt}
        fill
        sizes="(max-width: 699px) 100vw, 50vw"
        priority={false}
      />
      {hasBack && backSrc ? (
        <Image
          className={`shirt-photo shirt-photo-back${showBack ? " is-active" : ""}`}
          src={backSrc}
          alt={`${name} back`}
          fill
          sizes="(max-width: 699px) 100vw, 50vw"
          aria-hidden={!showBack}
        />
      ) : null}
    </Link>
  );
}
