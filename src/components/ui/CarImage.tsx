"use client";

import { useState } from "react";
import Image from "next/image";
import { Car as CarIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface CarImageProps {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

const GRADIENTS = [
  "from-brand-700 to-brand-900",
  "from-brand-800 to-brand-950",
  "from-brand-600 to-brand-800",
];

function gradientFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash + text.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[hash];
}

export function CarImage({ src, alt, className, sizes, priority }: CarImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br text-white/80",
          gradientFor(alt),
          className
        )}
        role="img"
        aria-label={alt}
      >
        <CarIcon className="h-10 w-10 opacity-70" strokeWidth={1.5} />
        <span className="px-3 text-center text-xs font-medium leading-snug opacity-80">
          الصورة غير متوفرة حالياً
        </span>
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
