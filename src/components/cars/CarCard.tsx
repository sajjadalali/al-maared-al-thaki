"use client";

import Link from "next/link";
import { Heart, Gauge, Fuel, Settings2, MapPin, ArrowLeft } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { formatIQD, formatNumber } from "@/lib/format";
import { useFavorites } from "@/context/FavoritesContext";
import type { Car } from "@/types/car";
import { cn } from "@/lib/cn";

export function CarCard({ car, className }: { car: Car; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(car.id);

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm ring-1 ring-black/[0.02] transition hover:shadow-lg",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-900">
        <Link href={`/cars/${car.id}`} className="absolute inset-0">
          <CarImage
            src={car.images[0]}
            alt={`${car.brand} ${car.model} ${car.year}`}
            className="transition duration-300 group-hover:scale-105"
          />
        </Link>

        <button
          type="button"
          onClick={() => toggleFavorite(car.id)}
          aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          aria-pressed={favorite}
          className="absolute start-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Heart
            className={cn("h-4.5 w-4.5", favorite ? "fill-danger text-danger" : "text-brand-900")}
          />
        </button>

        <span
          className={cn(
            "absolute end-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
            car.condition === "جديدة" ? "bg-success text-white" : "bg-white/95 text-brand-900"
          )}
        >
          {car.condition}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="truncate text-base font-bold text-brand-950">
            {car.brand} {car.model} {car.year}
          </h3>
          <p className="mt-1 text-lg font-extrabold text-brand-800">{formatIQD(car.price)}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            {car.engine}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            {car.transmission}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            {formatNumber(car.mileage)} كم
          </span>
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            {car.city}
          </span>
        </div>

        <Link
          href={`/cars/${car.id}`}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-brand-900 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          تفاصيل السيارة
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
