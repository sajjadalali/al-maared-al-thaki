import Link from "next/link";
import { ArrowLeft, Car } from "lucide-react";
import { getFeaturedCars } from "@/data/cars";
import { CarCard } from "@/components/cars/CarCard";

export function FeaturedCars() {
  const cars = getFeaturedCars(8);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-brand-700" />
          <h2 className="text-lg font-extrabold text-brand-950 sm:text-2xl">
            أحدث السيارات المعروضة
          </h2>
        </div>
        <Link
          href="/cars"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-brand-700 transition hover:text-brand-900"
        >
          <ArrowLeft className="h-4 w-4" />
          عرض الكل
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  );
}
