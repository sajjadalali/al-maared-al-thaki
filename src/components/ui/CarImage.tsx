"use client";

import { useState } from "react";
import Image from "next/image";
import { CarArt } from "@/components/ui/CarArt";
import { cn } from "@/lib/cn";

interface CarImageProps {
  src?: string;
  alt: string;
  /** Drawn in the car's shape and colour when there is no photo (or it fails to load). */
  bodyType: string;
  color?: string;
  className?: string;
  sizes?: string;
  /** Load right away at high priority: the page's main (LCP) photo. */
  eager?: boolean;
  /** Small "illustration" note on the drawing, for large views. */
  showNote?: boolean;
  /**
   * "contain" (default) shows the whole car on a soft studio backdrop, so wide
   * shots never lose their bumpers; "cover" fills small thumbnails.
   */
  fit?: "contain" | "cover";
}

export function CarImage({
  src,
  alt,
  bodyType,
  color,
  className,
  // A card is a quarter of a computer screen, half a tablet's, and the whole
  // width of a phone (20 Nov: phones were sent a photo half the width they needed).
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  eager,
  showNote,
  fit = "contain",
}: CarImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_10%,#ffffff_0%,#eef0f3_55%,#e2e5ea_100%)]",
          className
        )}
        role="img"
        aria-label={alt}
      >
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-b from-transparent to-black/[0.04]" />
        <CarArt bodyType={bodyType} color={color} className="relative w-[84%] translate-y-[4%]" />
        {showNote && (
          <span className="absolute bottom-3 start-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-black/5 backdrop-blur">
            صورة توضيحية — الصور الحقيقية قريباً
          </span>
        )}
      </div>
    );
  }

  const photo = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
  // Until the photo is in, its place shimmers softly (20 Nov), so a slow photo
  // reads as on its way, not as an empty grey box. Plain CSS, no blurred copy
  // of the photo (that one became the page's LCP, see below).
  const waiting = !loaded && (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent motion-safe:animate-shimmer" />
    </div>
  );
  if (fit === "cover")
    return (
      <>
        {!loaded && <div aria-hidden className="absolute inset-0 bg-surface-muted" />}
        {waiting}
        {photo}
      </>
    );

  // A plain backdrop behind the letterboxed photo (15 Nov). It was a blurred
  // copy of the photo, which the browser counted as the page's largest image
  // (LCP) and painted late, as it loaded lazily: about 2.5–3 s on phones.
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,#ffffff_0%,#eef0f3_55%,#e2e5ea_100%)]" />
      {waiting}
      {photo}
    </>
  );
}
