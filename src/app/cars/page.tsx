import type { Metadata } from "next";
import { filterCars, getCatalogFilterOptions } from "@/data/cars";
import { priceBandIndex } from "@/lib/filterOptions";
import { CarFilters } from "@/components/cars/CarFilters";
import { CarGrid } from "@/components/cars/CarGrid";
import { CarSort } from "@/components/cars/CarSort";
import { sortCars } from "@/lib/sortCars";
import { CategoryPills } from "@/components/cars/CategoryPills";
import { ActiveFilters } from "@/components/cars/ActiveFilters";
import type { CarCondition, CarOrigin, FuelType, Transmission } from "@/types/car";

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

// A malformed number in a shared link (e.g. minPrice=abc) is ignored, not
// turned into NaN, which would silently filter out every car.
function num(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default async function CarsPage({ searchParams }: CarsPageProps) {
  const params = await searchParams;

  const brand = first(params.brand);
  const bodyType = first(params.bodyType);
  const condition = first(params.condition) as CarCondition | undefined;
  const origin = first(params.origin) as CarOrigin | undefined;
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
    origin,
    city,
    fuel,
    transmission,
    query,
    minPrice: num(minPrice),
    maxPrice: num(maxPrice),
    minYear: num(minYear),
    maxYear: num(maxYear),
  });

  if (tag) {
    cars = cars.filter((car) => car.tags?.includes(tag));
  }

  cars = sortCars(cars, sort);

  const filterOptions = getCatalogFilterOptions(
    {
      tag,
      brand,
      city,
      year: minYear,
      price: priceBandIndex(minPrice ?? null, maxPrice ?? null) || undefined,
      bodyType,
      condition,
      origin,
      fuel,
      transmission,
    },
    query
  );

  const heading =
    condition === "جديدة" ? "السيارات الجديدة" : condition === "مستعملة" ? "السيارات المستعملة" : "كل السيارات";

  return (
    <div>
      <div className="border-b border-black/[0.06] bg-surface">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <h1 className="text-3xl font-bold text-brand-950 sm:text-[36px]">{heading}</h1>
          <p className="mt-2 text-[15px] text-neutral-500">
            جديدة ومستعملة، وكالة ووارد، بأسعار معلنة بالدينار العراقي. لم تجد ما تبحث عنه؟ اسأل سديم
            وسيبحث لك.
          </p>
          <div className="mt-6">
            <CategoryPills
              active={bodyType ?? (tag === "فاخرة" ? "فاخرة" : fuel === "كهربائي" ? "كهربائية" : "all")}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <div className="hidden lg:block">
          <CarFilters options={filterOptions} resultCount={cars.length} variant="sidebar" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <CarFilters options={filterOptions} resultCount={cars.length} variant="drawer" />
              </div>
              <p className="text-sm font-semibold text-neutral-500">
                <span className="text-base font-bold text-brand-950">{cars.length}</span> سيارة
              </p>
            </div>
            <CarSort />
          </div>

          <div className="mb-5 empty:hidden">
            <ActiveFilters />
          </div>

          <CarGrid cars={cars} eagerCount={2} />
        </div>
      </div>
    </div>
  );
}
