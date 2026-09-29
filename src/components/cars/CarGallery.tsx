"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { cn } from "@/lib/cn";
import type { Car } from "@/types/car";

export function CarGallery({ car }: { car: Car }) {
  const images = car.images.length > 0 ? car.images : [undefined];
  const [active, setActive] = useState(0);
  const alt = `${car.brand} ${car.model} ${car.year}`;

  function next() {
    setActive((i) => (i + 1) % images.length);
  }
  function prev() {
    setActive((i) => (i - 1 + images.length) % images.length);
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-brand-900 sm:aspect-[16/10]">
        <CarImage src={images[active]} alt={alt} priority sizes="(min-width: 1024px) 60vw, 100vw" />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="الصورة السابقة"
              className="absolute start-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow-md hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="الصورة التالية"
              className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow-md hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 end-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-900 ring-2 transition",
                active === i ? "ring-brand-700" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              <CarImage src={src} alt={`${alt} - صورة ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
