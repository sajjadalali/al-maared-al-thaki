import Link from "next/link";
import { getCatalog } from "@/server/catalog";
import { brandLabel } from "@/lib/filterOptions";
import { carCount } from "@/lib/format";
import { SectionHeading } from "@/components/home/SectionHeading";

export async function Brands() {
  const stock = (await getCatalog()).getAllCars().filter((car) => car.status !== "مباعة");
  const counts = new Map<string, number>();
  for (const car of stock) counts.set(car.brand, (counts.get(car.brand) ?? 0) + 1);
  const brands = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <SectionHeading eyebrow="الماركات" title="تصفّح حسب الماركة" />

      {/* Phones (20 Nov): one row to swipe, like the picked cars, instead of
          16 cards in two columns (over a screen and a half). The English name
          under each make left everywhere: it told a buyer here nothing new. */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-8">
        {brands.map(([brand, count]) => (
          <Link
            key={brand}
            href={`/cars?brand=${encodeURIComponent(brand)}`}
            className="group flex w-[7.25rem] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border border-black/[0.07] bg-white px-3 py-4 text-center transition hover:border-brand-200 hover:bg-surface sm:w-auto"
          >
            <span className="text-[15px] font-bold text-brand-950">{brandLabel(brand)}</span>
            <span className="mt-1 text-[12.5px] font-semibold text-brand-600">{carCount(count)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
