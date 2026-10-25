"use client";

import Link from "next/link";
import { ArrowLeft, Fuel, Gauge, Heart, MapPin, Settings2 } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { formatCarMileage, formatNumber, originLabel } from "@/lib/format";
import { useFavorites } from "@/context/FavoritesContext";
import type { Car } from "@/types/car";
import { cn } from "@/lib/cn";

/** "3.5L بنزين", or just "كهربائي" — short enough for a card column. */
export function shortPowertrain(car: Car): string {
  if (car.fuel === "كهربائي") return "كهربائي";
  const size = car.engine.split(" ")[0];
  return /^\d/.test(size) ? `${size} ${car.fuel}` : car.fuel;
}

export function CarCard({ car, className }: { car: Car; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(car.id);
  const name = `${car.brand} ${car.model}`;
  const subtitle = [car.trim, car.year].filter(Boolean).join(" · ");
  const isNew = car.condition === "جديدة";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-[0_22px_40px_-24px_rgba(11,19,34,0.45)]",
        className
      )}
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        <CarImage
          src={car.images[0]}
          alt={`${name} ${car.year}`}
          bodyType={car.bodyType}
          color={car.color}
          className="transition duration-500 group-hover:scale-[1.04]"
        />

        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11.5px] font-bold shadow-sm",
              isNew ? "bg-brand-950 text-white" : "bg-white text-brand-900 ring-1 ring-black/5"
            )}
          >
            {isNew ? "جديدة · زيرو" : "مستعملة"}
          </span>
          {car.origin && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-neutral-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
              {originLabel(car.origin)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleFavorite(car.id)}
          aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          aria-pressed={favorite}
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 transition hover:scale-105"
        >
          <Heart className={cn("h-4.5 w-4.5", favorite ? "fill-danger text-danger" : "text-brand-900")} />
        </button>

        {car.status !== "متوفرة" && (
          <span
            className={cn(
              "absolute bottom-3 start-3 rounded-full px-2.5 py-1 text-[11.5px] font-bold shadow-sm",
              car.status === "محجوزة" ? "bg-accent-400 text-brand-950" : "bg-danger text-white"
            )}
          >
            {car.status}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-[15.5px] font-bold text-brand-950">
          <Link href={`/cars/${car.id}`} className="after:absolute after:inset-0">
            <bdi>{name}</bdi>
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-neutral-500">
          <bdi>{subtitle}</bdi>
        </p>

        <p className="mt-3 flex items-baseline gap-1.5 text-brand-950">
          <span className="text-[21px] font-bold leading-none tracking-tight">{formatNumber(car.price)}</span>
          <span className="text-[13px] font-semibold text-neutral-500">د.ع</span>
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-black/[0.06] pt-3 text-[12px] text-neutral-600">
          <span className="flex min-w-0 items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{formatCarMileage(car.mileage)}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <bdi className="truncate">{shortPowertrain(car)}</bdi>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{car.transmission}</span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12.5px]">
          <span className="flex items-center gap-1 text-neutral-500">
            <MapPin className="h-3.5 w-3.5" />
            {car.city}
          </span>
          <span className="flex items-center gap-1 font-bold text-brand-700 transition group-hover:gap-1.5 group-hover:text-brand-950">
            التفاصيل
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
