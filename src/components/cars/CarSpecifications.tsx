import {
  Calendar,
  Gauge,
  Settings2,
  Fuel,
  Cog,
  Users,
  Palette,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

export function CarSpecifications({ car }: { car: Car }) {
  const specs = [
    { icon: Calendar, label: "سنة الصنع", value: String(car.year) },
    { icon: Gauge, label: "المسافة المقطوعة", value: `${formatNumber(car.mileage)} كم` },
    { icon: Settings2, label: "ناقل الحركة", value: car.transmission },
    { icon: Fuel, label: "نوع الوقود", value: car.fuel },
    { icon: Cog, label: "سعة المحرك", value: car.engine },
    { icon: Users, label: "عدد المقاعد", value: `${car.seats} مقاعد` },
    { icon: Palette, label: "اللون", value: car.color },
    { icon: MapPin, label: "المدينة", value: car.city },
    { icon: BadgeCheck, label: "الحالة", value: car.condition },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {specs.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-surface p-3 sm:gap-3 sm:p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 sm:h-9 sm:w-9">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-neutral-500">{label}</p>
            <p className="break-words text-sm font-bold leading-6 text-brand-950">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
