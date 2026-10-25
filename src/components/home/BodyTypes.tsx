import Link from "next/link";
import { getAllCars } from "@/data/cars";
import { CarArt } from "@/components/ui/CarArt";
import { SectionHeading } from "@/components/home/SectionHeading";

// Display names as buyers say them; the data keeps the Excel values.
const BODY_TYPES = [
  { value: "SUV", label: "SUV", hint: "عائلية ومريحة" },
  { value: "سيدان", label: "سيدان", hint: "للاستخدام اليومي" },
  { value: "دفع رباعي", label: "دفع رباعي", hint: "للطرق الخارجية" },
  { value: "شاحنة", label: "بيك أب", hint: "للعمل والحمل" },
  { value: "هاتشباك", label: "هاتشباك", hint: "صغيرة واقتصادية" },
  { value: "كوبيه", label: "كوبيه", hint: "رياضية" },
];

export function BodyTypes() {
  const stock = getAllCars().filter((car) => car.status !== "مباعة");
  const types = BODY_TYPES.map((type) => ({
    ...type,
    count: stock.filter((car) => car.bodyType === type.value).length,
  })).filter((type) => type.count > 0);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="تسوّق حسب النوع" title="اختر حسب نوع السيارة" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {types.map((type) => (
          <Link
            key={type.value}
            href={`/cars?bodyType=${encodeURIComponent(type.value)}`}
            className="group flex flex-col rounded-2xl border border-black/[0.07] bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-[0_18px_36px_-24px_rgba(11,19,34,0.45)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold text-brand-950">{type.label}</p>
                <p className="text-xs text-neutral-500">{type.hint}</p>
              </div>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-brand-700">
                {type.count}
              </span>
            </div>
            <CarArt
              bodyType={type.value}
              color="فضي"
              className="mt-3 w-full transition duration-500 group-hover:-translate-x-1.5"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
