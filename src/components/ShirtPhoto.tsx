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

const MOBILE_FLIP_MS = 8_000;

/**
 * Shirt photo that links to Etsy on click.
 * Desktop: hover shows the back. Mobile: auto-flips every 8s.
 */
export function ShirtPhoto({
  name,
  frontSrc,
  backSrc,
  alt,
  etsyUrl,
}: ShirtPhotoProps) {
  const [showBack, setShowBack] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasBack = Boolean(backSrc);
  const activeSrc = showBack && backSrc ? backSrc : frontSrc;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 699px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!hasBack || !isMobile) return;
    const id = window.setInterval(() => {
      setShowBack((value) => !value);
    }, MOBILE_FLIP_MS);
    return () => window.clearInterval(id);
  }, [hasBack, isMobile]);

  return (
    <a
      className="shirt-photo-link"
      href={etsyUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Buy ${name} on Etsy`}
      onMouseEnter={() => {
        if (hasBack && !isMobile) setShowBack(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) setShowBack(false);
      }}
    >
      <Image
        className="shirt-photo"
        src={activeSrc}
        alt={showBack && hasBack ? `${name} back` : alt}
        fill
        sizes="(max-width: 699px) 100vw, 50vw"
      />
      {hasBack && backSrc ? (
        <Image
          className="shirt-photo-preload"
          src={showBack ? frontSrc : backSrc}
          alt=""
          width={320}
          height={360}
          aria-hidden
        />
      ) : null}
    </a>
  );
}
