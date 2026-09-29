import type { Metadata } from "next";
import { filterCars } from "@/data/cars";
import { CarFilters } from "@/components/cars/CarFilters";
import { CarGrid } from "@/components/cars/CarGrid";
import { CarSort } from "@/components/cars/CarSort";
import { sortCars } from "@/lib/sortCars";
import { CategoryPills } from "@/components/cars/CategoryPills";
import type { CarCondition, FuelType, Transmission } from "@/types/car";

export const metadata: Metadata = {
  title: "تصفح السيارات",
  description: "تصفح السيارات الجديدة والمستعملة المتوفرة في العراق مع الأسعار والمواصفات.",
};

interface CarsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CarsPage({ searchParams }: CarsPageProps) {
  const params = await searchParams;

  const brand = first(params.brand);
  const bodyType = first(params.bodyType);
  const condition = first(params.condition) as CarCondition | undefined;
  const city = first(params.city);
  const fuel = first(params.fuel) as FuelType | undefined;
  const transmission = first(params.transmission) as Transmission | undefined;
  const query = first(params.query);
  const minPrice = first(params.minPrice);
  const maxPrice = first(params.maxPrice);
  const minYear = first(params.minYear);
  const maxYear = first(params.maxYear);
  const tag = first(params.tag);
  const sort = first(params.sort) ?? "featured";

  let cars = filterCars({
    brand,
    bodyType,
    condition,
    city,
    fuel,
    transmission,
    query,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minYear: minYear ? Number(minYear) : undefined,
    maxYear: maxYear ? Number(maxYear) : undefined,
  });

  if (tag) {
    cars = cars.filter((car) => car.tags?.includes(tag));
  }

  cars = sortCars(cars, sort);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">تصفح السيارات</h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          اكتشف مجموعتنا من السيارات الجديدة والمستعملة، أو تحدث مع سديم ليبحث لك عن أفضل خيار
          يناسبك.
        </p>
      </div>

      <div className="mb-6">
        <CategoryPills active={bodyType ?? (tag === "فاخرة" ? "فاخرة" : fuel === "كهربائي" ? "كهربائية" : "all")} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <CarFilters />

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-500">
              عدد النتائج: <span className="text-brand-950">{cars.length}</span>
            </p>
            <CarSort />
          </div>

          <CarGrid cars={cars} />
        </div>
      </div>
    </div>
  );
}
