import Link from "next/link";
import { getCatalog } from "@/server/catalog";
import { CarArt } from "@/components/ui/CarArt";
import { SectionHeading } from "@/components/home/SectionHeading";

// Display names as buyers say them; the data keeps the Excel values. Each type
// has its own paint, and its card is tinted with it.
const BODY_TYPES = [
  { value: "SUV", label: "SUV", hint: "عائلية ومريحة", paint: "#2f7fd6" },
  { value: "سيدان", label: "سيدان", hint: "للاستخدام اليومي", paint: "#c23a2e" },
  { value: "دفع رباعي", label: "دفع رباعي", hint: "للطرق الخارجية", paint: "#5f7f63" },
  { value: "شاحنة", label: "بيك أب", hint: "للعمل والحمل", paint: "#e08a1e" },
  { value: "هاتشباك", label: "هاتشباك", hint: "صغيرة واقتصادية", paint: "#18a8a0" },
  { value: "كوبيه", label: "كوبيه", hint: "رياضية", paint: "#6a4fc4" },
];

export async function BodyTypes() {
  const stock = (await getCatalog()).getAllCars().filter((car) => car.status !== "مباعة");
  const types = BODY_TYPES.map((type) => ({
    ...type,
    count: stock.filter((car) => car.bodyType === type.value).length,
  })).filter((type) => type.count > 0);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-14 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="حسب النوع" title="شنو نوع السيارة اللي تريدها؟" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {types.map((type) => (
          <Link
            key={type.value}
            href={`/cars?bodyType=${encodeURIComponent(type.value)}`}
            className="group flex flex-col overflow-hidden rounded-3xl border border-black/[0.07] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-black/10 hover:shadow-[0_18px_36px_-24px_rgba(11,19,34,0.45)]"
          >
            {/* the drawing on a wash of its own paint, standing on a ground line */}
            <div className="relative px-3 pt-5" style={{ backgroundColor: `${type.paint}1c` }}>
              <span aria-hidden className="absolute inset-x-0 bottom-[17%] h-px" style={{ backgroundColor: `${type.paint}55` }} />
              <CarArt
                bodyType={type.value}
                color={type.paint}
                className="relative w-full transition duration-500 group-hover:-translate-x-1.5"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-base font-bold text-brand-950">{type.label}</p>
                <p className="truncate text-xs leading-5 text-neutral-500">{type.hint}</p>
              </div>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: `${type.paint}1c`, color: "#0b1322" }}>
                {type.count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
