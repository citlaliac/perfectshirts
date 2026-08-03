"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ShirtPhotoProps = {
  name: string;
  frontSrc: string;
  backSrc?: string;
  alt: string;
  /** Clicking the photo opens this Etsy URL in a new tab. */
  etsyUrl: string;
};

/** Front for 8s, back for 8s, repeat on phones / touch devices. */
const MOBILE_FLIP_MS = 8_000;

/**
 * Shirt photo that links to Etsy on click.
 * Desktop (mouse): hover shows the back.
 * Mobile / touch: auto-flips front ↔ back every 8 seconds.
 */
export function ShirtPhoto({
  name,
  frontSrc,
  backSrc,
  alt,
  etsyUrl,
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

  // Front → wait 8s → back → wait 8s → front… forever while auto-flip is on.
  useEffect(() => {
    if (!hasBack || !autoFlip) {
      setShowBack(false);
      return;
    }

    setShowBack(false);
    const id = window.setInterval(() => {
      setShowBack((showingBack) => !showingBack);
    }, MOBILE_FLIP_MS);

    return () => window.clearInterval(id);
  }, [hasBack, autoFlip]);

  return (
    <a
      className={`shirt-photo-link${showBack && hasBack ? " is-showing-back" : ""}`}
      href={etsyUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Buy ${name} on Etsy`}
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
    </a>
  );
}
