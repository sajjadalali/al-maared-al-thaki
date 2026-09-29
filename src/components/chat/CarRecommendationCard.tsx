import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CarImage } from "@/components/ui/CarImage";
import { formatIQD, formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

function Thumb({ car }: { car: Car }) {
  return (
    <div className="relative h-14 w-[76px] shrink-0 overflow-hidden rounded-lg bg-brand-900">
      <CarImage
        src={car.images[0]}
        alt={`${car.brand} ${car.model}`}
        sizes="76px"
        className="[&_span]:hidden [&_svg]:h-5 [&_svg]:w-5"
      />
    </div>
  );
}

function Title({ car }: { car: Car }) {
  return (
    <p className="truncate text-[13.5px] font-bold leading-5 text-brand-950">
      <bdi>
        {car.brand} {car.model}
      </bdi>{" "}
      <span className="font-semibold text-neutral-500">{car.year}</span>
    </p>
  );
}

/** One row in a list reply: thumbnail, name, price and a one-line summary. */
export function CarRecommendationCard({ car }: { car: Car }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group flex items-center gap-2.5 rounded-xl border border-black/5 bg-white p-1.5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
    >
      <Thumb car={car} />
      <div className="min-w-0 flex-1">
        <Title car={car} />
        <p className="text-[14px] font-extrabold leading-5 text-brand-800">{formatIQD(car.price)}</p>
        <p className="truncate text-[11.5px] leading-5 text-neutral-500">
          {car.condition} · {formatNumber(car.mileage)} كم · {car.city}
        </p>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:text-brand-600" />
    </Link>
  );
}

/** A reply about one specific car: the same compact row plus its key specs. */
export function CarDetailChatCard({ car }: { car: Car }) {
  const specs = [
    `${formatNumber(car.mileage)} كم`,
    car.transmission,
    car.engine.includes(car.fuel) ? car.engine : `${car.engine} ${car.fuel}`,
    `${car.seats} مقاعد`,
  ];

  return (
    <div className="rounded-xl border border-black/5 bg-white p-1.5 shadow-sm">
      <Link href={`/cars/${car.id}`} className="group flex items-center gap-2.5">
        <Thumb car={car} />
        <div className="min-w-0 flex-1">
          <Title car={car} />
          <p className="text-[14px] font-extrabold leading-5 text-brand-800">{formatIQD(car.price)}</p>
          <p className="truncate text-[11.5px] leading-5 text-neutral-500">
            {car.condition} · {car.city}
          </p>
        </div>
        <ChevronLeft className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:text-brand-600" />
      </Link>

      <div className="mt-1.5 flex flex-wrap gap-1 px-0.5 pb-0.5">
        {specs.map((spec) => (
          <span key={spec} className="rounded-md bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-neutral-600">
            <bdi>{spec}</bdi>
          </span>
        ))}
      </div>
    </div>
  );
}
