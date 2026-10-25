import Link from "next/link";
import { getAllCars } from "@/data/cars";
import { brandLabel } from "@/lib/filterOptions";
import { SectionHeading } from "@/components/home/SectionHeading";

export function Brands() {
  const stock = getAllCars().filter((car) => car.status !== "مباعة");
  const counts = new Map<string, number>();
  for (const car of stock) counts.set(car.brand, (counts.get(car.brand) ?? 0) + 1);
  const brands = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="الماركات" title="تصفّح حسب الماركة" />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {brands.map(([brand, count]) => (
          <Link
            key={brand}
            href={`/cars?brand=${encodeURIComponent(brand)}`}
            className="group flex flex-col items-center justify-center rounded-2xl border border-black/[0.07] bg-white px-3 py-4 text-center transition hover:border-brand-200 hover:bg-surface"
          >
            <span className="text-[15px] font-bold text-brand-950">{brandLabel(brand)}</span>
            <span className="mt-0.5 text-[11.5px] font-medium text-neutral-400" dir="ltr">
              {brand}
            </span>
            <span className="mt-2 text-[11.5px] font-semibold text-brand-600">
              {count === 1 ? "سيارة واحدة" : count === 2 ? "سيارتان" : `${count} سيارات`}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
