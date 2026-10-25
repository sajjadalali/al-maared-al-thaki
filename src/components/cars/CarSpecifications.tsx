import { Cog, Gauge, Users, Zap } from "lucide-react";
import { paintFor } from "@/components/ui/CarArt";
import { drivetrainLabel, formatCarMileage, originLabel } from "@/lib/format";
import type { Car } from "@/types/car";

/** The four numbers buyers compare first, as large tiles. */
export function CarHighlights({ car }: { car: Car }) {
  const tiles = [
    car.horsepower && { icon: Zap, label: "القوة", value: `${car.horsepower} حصان` },
    { icon: Cog, label: "المحرك", value: car.engine },
    { icon: Gauge, label: "نظام الدفع", value: car.drivetrain ? drivetrainLabel(car.drivetrain) : car.transmission },
    { icon: Users, label: "المقاعد", value: `${car.seats} مقاعد` },
  ].filter((t): t is { icon: typeof Zap; label: string; value: string } => Boolean(t));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-2xl bg-surface p-4">
          <Icon className="h-5 w-5 text-brand-500" />
          <p className="mt-3 text-xs font-medium text-neutral-500">{label}</p>
          <p className="mt-0.5 text-[15px] font-bold leading-6 text-brand-950">
            <bdi>{value}</bdi>
          </p>
        </div>
      ))}
    </div>
  );
}

export function CarSpecifications({ car }: { car: Car }) {
  const rows: { label: string; value?: string | number; swatch?: string }[] = [
    { label: "الماركة", value: car.brand },
    { label: "الموديل", value: car.model },
    { label: "الفئة", value: car.trim },
    { label: "سنة الصنع", value: car.year },
    { label: "الحالة", value: car.condition },
    { label: "الوارد", value: car.origin && originLabel(car.origin) },
    { label: "الممشى", value: formatCarMileage(car.mileage) },
    { label: "نوع الهيكل", value: car.bodyType === "شاحنة" ? "بيك أب" : car.bodyType },
    { label: "المحرك", value: car.engine },
    { label: "السلندر", value: car.cylinders },
    { label: "القوة", value: car.horsepower && `${car.horsepower} حصان` },
    { label: "ناقل الحركة", value: car.transmission },
    { label: "نظام الدفع", value: car.drivetrain && drivetrainLabel(car.drivetrain) },
    { label: "الوقود", value: car.fuel },
    { label: "المقاعد", value: car.seats },
    { label: "اللون", value: car.color, swatch: car.color ? paintFor(car.color) : undefined },
    { label: "المدينة", value: car.city },
    { label: "رقم السيارة في المعرض", value: car.id.replace("car-", "#") },
  ];

  return (
    <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-black/[0.07] sm:grid-cols-2">
      {rows
        .filter((row) => row.value !== undefined && row.value !== "")
        .map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-3.5 text-sm sm:odd:border-e"
          >
            <dt className="text-neutral-500">{row.label}</dt>
            <dd className="flex items-center gap-2 text-end font-bold text-brand-950">
              {row.swatch && (
                <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: row.swatch }} />
              )}
              <bdi>{row.value}</bdi>
            </dd>
          </div>
        ))}
    </dl>
  );
}
