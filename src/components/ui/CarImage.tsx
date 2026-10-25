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
  priority?: boolean;
  /** Small "illustration" note on the drawing, for large views. */
  showNote?: boolean;
}

export function CarImage({ src, alt, bodyType, color, className, sizes, priority, showNote }: CarImageProps) {
  const [failed, setFailed] = useState(false);

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

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
