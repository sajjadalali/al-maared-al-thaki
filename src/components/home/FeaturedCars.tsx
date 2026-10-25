import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFeaturedCars } from "@/data/cars";
import { CarCard } from "@/components/cars/CarCard";
import { SectionHeading } from "@/components/home/SectionHeading";

export function FeaturedCars() {
  const cars = getFeaturedCars(8);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="مختارات المعرض"
        title="سيارات ننصح بها هذا الأسبوع"
        description="سيارات مفحوصة وجاهزة للتسليم، من الوكالة والوارد، بأسعار معلنة بالدينار العراقي."
        link={{ href: "/cars", label: "كل السيارات" }}
      />

      {/* Phones swipe through the picks instead of scrolling past eight tall cards. */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} className="w-[80%] shrink-0 snap-start sm:w-auto" />
        ))}
      </div>

      <Link
        href="/cars"
        className="mt-6 flex items-center justify-center gap-1.5 rounded-full border border-black/10 py-3 text-sm font-bold text-brand-900 sm:hidden"
      >
        كل السيارات
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </section>
  );
}
