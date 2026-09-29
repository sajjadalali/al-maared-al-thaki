import { SearchX } from "lucide-react";
import { CarCard } from "@/components/cars/CarCard";
import type { Car } from "@/types/car";
import { cn } from "@/lib/cn";

// Default columns suit the listing page, which has a filters sidebar beside it.
export function CarGrid({ cars, className }: { cars: Car[]; className?: string }) {
  if (cars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white py-20 text-center">
        <SearchX className="h-10 w-10 text-neutral-300" />
        <p className="text-base font-bold text-brand-950">لا توجد سيارات مطابقة</p>
        <p className="max-w-sm text-sm text-neutral-500">
          جرّب تعديل الفلاتر أو كلمات البحث، أو تحدث مع سديم ليبحث لك عن أفضل خيار.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
