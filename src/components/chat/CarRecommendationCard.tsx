import Link from "next/link";
import { ChevronLeft, Fuel, Gauge, Settings2, Users } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { formatIQD, formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

/** One row in a list reply: thumbnail, name, price and a one-line summary. */
export function CarRecommendationCard({ car }: { car: Car }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-2 shadow-sm transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="relative h-[68px] w-[92px] shrink-0 overflow-hidden rounded-xl bg-brand-900">
        <CarImage
          src={car.images[0]}
          alt={`${car.brand} ${car.model}`}
          sizes="92px"
          className="[&_span]:hidden [&_svg]:h-6 [&_svg]:w-6"
        />
        <span className="absolute bottom-1 start-1 rounded-md bg-white/95 px-1.5 py-px text-[10px] font-bold text-brand-900">
          {car.condition}
        </span>
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-[14px] font-bold text-brand-950">
          <bdi>
            {car.brand} {car.model}
          </bdi>{" "}
          <span className="font-semibold text-neutral-500">{car.year}</span>
        </p>
        <p className="mt-0.5 text-[15px] font-extrabold text-brand-800">{formatIQD(car.price)}</p>
        <p className="mt-0.5 truncate text-[12px] text-neutral-500">
          {formatNumber(car.mileage)} كم · {car.transmission} · {car.city}
        </p>
      </div>

      <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:text-brand-600" />
    </Link>
  );
}

/** A reply about one specific car: photo, price, key specs and highlights. */
export function CarDetailChatCard({ car }: { car: Car }) {
  const specs = [
    { icon: Gauge, label: "الكيلومترات", value: `${formatNumber(car.mileage)} كم` },
    { icon: Settings2, label: "ناقل الحركة", value: car.transmission },
    {
      icon: Fuel,
      label: "المحرك",
      value: car.engine.includes(car.fuel) ? car.engine : `${car.engine} ${car.fuel}`,
    },
    { icon: Users, label: "المقاعد", value: `${car.seats} مقاعد` },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="relative aspect-[16/9] w-full bg-brand-900">
        <CarImage src={car.images[0]} alt={`${car.brand} ${car.model}`} sizes="340px" />
        <span className="absolute end-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-brand-900 shadow-sm">
          {car.condition}
        </span>
      </div>

      <div className="space-y-3 p-3.5">
        <div className="flex items-end justify-between gap-2">
          <p className="min-w-0 text-[15px] font-extrabold leading-6 text-brand-950">
            <bdi>
              {car.brand} {car.model}
            </bdi>{" "}
            <span className="font-semibold text-neutral-500">{car.year}</span>
          </p>
          <p className="shrink-0 text-[15px] font-extrabold text-brand-800">{formatIQD(car.price)}</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {specs.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2">
              <Icon className="h-4 w-4 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <p className="text-[10.5px] leading-4 text-neutral-500">{label}</p>
                <p className="truncate text-[12.5px] font-bold leading-5 text-brand-950">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {car.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {car.features.slice(0, 4).map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-brand-100 bg-brand-50/60 px-2.5 py-1 text-[11.5px] font-semibold text-brand-800"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/cars/${car.id}`}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-900 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-800"
        >
          عرض صفحة السيارة
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
