"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { cn } from "@/lib/cn";
import type { ImageCredit } from "@/data/imageCredits";
import type { Car } from "@/types/car";
import { carNameAr } from "@/lib/format";

const linkClass = "underline underline-offset-2 hover:text-white/80";

// `credits` lines up with car.images: the attribution of each licensed photo.
export function CarGallery({ car, credits = [] }: { car: Car; credits?: (ImageCredit | undefined)[] }) {
  const images = car.images.length > 0 ? car.images : [undefined];
  const [active, setActive] = useState(0);
  // The photo's credit sits behind an ⓘ on the photo (20 Nov); under it, it
  // was two lines of small grey text on phones. /credits lists them all.
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

  return (
    <div>
      {/* 3:2 like every car photo (scripts/frame-photos.mjs), so it fills the frame. */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl border border-black/[0.06] bg-surface">
        <CarImage
          src={images[active]}
          alt={alt}
          bodyType={car.bodyType}
          color={car.color}
          eager
          showNote
          sizes="(min-width: 1024px) 60vw, 100vw"
        />

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
            <span className="absolute bottom-3 end-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}

        {credit && (
          <>
            {/* Over the photo, under the arrows, which stay usable while it is open. */}
            {creditOpen && (
              <div
                id="photo-credit"
                className="absolute inset-x-3 bottom-14 rounded-2xl bg-brand-950/85 px-4 py-3 text-[13px] leading-6 text-white shadow-lg backdrop-blur"
              >
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
              </div>
            )}
            <button
              type="button"
              onClick={() => setCreditOpen((open) => !open)}
              aria-expanded={creditOpen}
              aria-controls="photo-credit"
              aria-label={creditOpen ? "سد مصدر الصورة" : "مصدر الصورة"}
              className="tap-target absolute bottom-3 start-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
            >
              {creditOpen ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>

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
    </div>
  );
}
