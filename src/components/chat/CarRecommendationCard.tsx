import Link from "next/link";
import { Fuel, Settings2, Gauge, ArrowLeft } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { formatIQD, formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

export function CarRecommendationCard({ car }: { car: Car }) {
  return (
    <div className="w-64 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm sm:w-72">
      <div className="relative aspect-[16/10] w-full bg-brand-900">
        <CarImage src={car.images[0]} alt={`${car.brand} ${car.model}`} sizes="288px" />
        <span className="absolute end-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-brand-900 shadow-sm">
          {car.condition}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div>
          <p className="truncate text-sm font-extrabold text-brand-950">
            {car.brand} {car.model} {car.year}
          </p>
          <p className="text-sm font-extrabold text-brand-800">{formatIQD(car.price)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Fuel className="h-3 w-3 text-brand-600" />
            {car.engine}
          </span>
          <span className="flex items-center gap-1">
            <Settings2 className="h-3 w-3 text-brand-600" />
            {car.transmission}
          </span>
          <span className="flex items-center gap-1">
            <Gauge className="h-3 w-3 text-brand-600" />
            {formatNumber(car.mileage)} كم
          </span>
        </div>

        <Link
          href={`/cars/${car.id}`}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-900 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
        >
          عرض التفاصيل
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
