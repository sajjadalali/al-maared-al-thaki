import { SearchX } from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import type { Car } from "@/types/car";

export function CarGrid({ cars }: { cars: Car[] }) {
  if (cars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white py-20 text-center">
        <SearchX className="h-10 w-10 text-neutral-300" />
        <p className="text-base font-bold text-brand-950">لا توجد سيارات مطابقة</p>
        <p className="max-w-sm text-sm text-neutral-500">
          جرّب تعديل الفلاتر أو كلمات البحث، أو تحدث مع سديم وخلّيه يدورلك على أفضل خيار.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
