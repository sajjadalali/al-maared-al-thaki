"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { photoUrl } from "@/lib/photo";
import { useBackCloses } from "@/lib/useBackCloses";
import { cn } from "@/lib/cn";
import type { ImageCredit } from "@/data/imageCredits";
import type { Car } from "@/types/car";
import { carNameAr } from "@/lib/format";

const linkClass = "underline underline-offset-2 hover:text-brand-950";

/**
 * A sideways swipe on a photo (21 Nov: on phones the photos only moved with
 * the small arrows). Right to left like the page: a finger pulled to the
 * right brings the next photo, as the "next" arrow is on the left. Not when
 * two fingers are on it, or the page is pinched in (that finger moves the
 * zoomed view). `swiped` lets the tap that ends a swipe be ignored.
 */
function useSwipe(next: () => void, prev: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    swiped,
    handlers: {
      onTouchStart(e: React.TouchEvent) {
        swiped.current = false;
        const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
        start.current = e.touches.length === 1 && !zoomed ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      },
      onTouchEnd(e: React.TouchEvent) {
        const from = start.current;
        start.current = null;
        if (!from || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - from.x;
        const dy = e.changedTouches[0].clientY - from.y;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        swiped.current = true;
        if (dx > 0) next();
        else prev();
      },
    },
  };
}

// `credits` lines up with car.images: the attribution of each licensed photo.
export function CarGallery({ car, credits = [] }: { car: Car; credits?: (ImageCredit | undefined)[] }) {
  const images = car.images.length > 0 ? car.images : [undefined];
  const [active, setActive] = useState(0);
  // The photo's credit opens from an ⓘ on the photo (20 Nov); before, it was
  // always two lines of small grey text under it on phones. /credits lists them all.
  const [creditOpen, setCreditOpen] = useState(false);
  const alt = `${carNameAr(car)} ${car.year}`;
  const credit = credits[active];

  function show(i: number) {
    setActive(i);
    setCreditOpen(false);
  }
  function next() {
    show((active + 1) % images.length);
  }
  function prev() {
    show((active - 1 + images.length) % images.length);
  }
  const several = images.length > 1;
  const swipe = useSwipe(several ? next : () => {}, several ? prev : () => {});

  // A tap on the photo opens it full screen (21 Nov), where it can also be
  // swiped and pinched. The phone's back button closes it.
  const [viewer, setViewer] = useState(false);
  const { dismiss: closeViewer } = useBackCloses(viewer, () => setViewer(false), "carPhotos");
  const viewerSwipe = useSwipe(several ? next : () => {}, several ? prev : () => {});
  useEffect(() => {
    if (!viewer) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      // Right to left: the left arrow key is "next", like the arrows on screen.
      if (e.key === "ArrowLeft" && several) next();
      if (e.key === "ArrowRight" && several) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  });

  return (
    <div>
      {/* 3:2 like every car photo (scripts/frame-photos.mjs), so it fills the frame. */}
      <div
        className="relative aspect-[3/2] w-full [touch-action:pan-y_pinch-zoom] overflow-hidden rounded-3xl border border-black/[0.06] bg-surface"
        {...swipe.handlers}
      >
        <CarImage
          src={images[active]}
          alt={alt}
          bodyType={car.bodyType}
          color={car.color}
          eager
          showNote
          sizes="(min-width: 1024px) 60vw, 100vw"
        />
        {images[active] && (
          <button
            type="button"
            onClick={() => !swipe.swiped.current && setViewer(true)}
            aria-label="كبّر الصورة"
            className="absolute inset-0 cursor-zoom-in"
          />
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="الصورة السابقة"
              className="tap-target absolute start-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow-md hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="الصورة التالية"
              className="tap-target absolute end-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow-md hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="pointer-events-none absolute bottom-3 end-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}

        {credit && (
          <button
            type="button"
            onClick={() => setCreditOpen((open) => !open)}
            aria-expanded={creditOpen}
            aria-controls="photo-credit"
            aria-label={creditOpen ? "سد مصدر الصورة" : "مصدر الصورة"}
            className="tap-target absolute bottom-3 start-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
          >
            {creditOpen ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Under the photo, so it never covers the car or the arrows. */}
      {credit && creditOpen && (
        <p id="photo-credit" className="mt-2 rounded-2xl bg-surface px-4 py-3 text-[13px] leading-6 text-neutral-600">
          صورة توضيحية للموديل · تصوير{" "}
          <a href={credit.source} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <bdi>{credit.author}</bdi>
          </a>{" "}
          ·{" "}
          {credit.licenseUrl ? (
            <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <bdi>{credit.license}</bdi>
            </a>
          ) : (
            <bdi>{credit.license}</bdi>
          )}{" "}
          · ويكيميديا كومنز، معدّلة لإطار 3:2 ·{" "}
          <Link href="/credits" className={linkClass}>
            كل حقوق الصور
          </Link>
        </p>
      )}

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => show(i)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-surface ring-2 transition",
                active === i ? "ring-brand-900" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              <CarImage
                src={src}
                alt={`${alt} - صورة ${i + 1}`}
                bodyType={car.bodyType}
                color={car.color}
                sizes="80px"
                fit="cover"
              />
            </button>
          ))}
        </div>
      )}

      {viewer && images[active] && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={`صور ${alt}`}>
          <div className="flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="px-2 text-sm font-semibold text-white/80" dir="ltr">
              {several ? `${active + 1} / ${images.length}` : ""}
            </span>
            <button
              type="button"
              onClick={closeViewer}
              aria-label="سد الصور"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Pinching zooms the whole screen (the browser's own zoom); a swipe
              only changes the photo while it isn't zoomed in. */}
          <div className="relative min-h-0 flex-1 [touch-action:pan-y_pinch-zoom]" {...viewerSwipe.handlers}>
            <Image src={photoUrl(images[active])} alt={alt} fill sizes="100vw" className="object-contain" />
            {several && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="الصورة السابقة"
                  className="absolute start-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="الصورة التالية"
                  className="absolute end-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
        </div>
      )}
    </div>
  );
}
