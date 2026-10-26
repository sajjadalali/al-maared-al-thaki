import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, Clock } from "lucide-react";
import { getAllCars, getCarById, getSimilarCars } from "@/data/cars";
import { getImageCredit } from "@/data/imageCredits";
import { formatCarMileage, formatNumber, formatUSD, originLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { site } from "@/config/site";
import { CarGallery } from "@/components/cars/CarGallery";
import { CarHighlights, CarSpecifications } from "@/components/cars/CarSpecifications";
import { CarContactActions } from "@/components/cars/CarContactActions";
import { CarFavoriteToggle } from "@/components/cars/CarFavoriteToggle";
import { CarGrid } from "@/components/cars/CarGrid";
import { MobileContactBar } from "@/components/cars/MobileContactBar";

interface CarDetailsPageProps {
  params: Promise<{ id: string }>;
}

// Every car page is built once at build time; ids added later still render on demand.
export function generateStaticParams() {
  return getAllCars().map((car) => ({ id: car.id }));
}

export async function generateMetadata({ params }: CarDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const car = getCarById(id);
  if (!car) return { title: "السيارة غير موجودة" };
  return {
    title: `${car.brand} ${car.model} ${car.trim ? `${car.trim} ` : ""}${car.year}`,
    description: car.description,
  };
}

const STATUS_STYLES: Record<string, { chip: string; dot: string }> = {
  متوفرة: { chip: "bg-success/10 text-success", dot: "bg-success" },
  محجوزة: { chip: "bg-accent-100 text-accent-700", dot: "bg-accent-500" },
  مباعة: { chip: "bg-danger/10 text-danger", dot: "bg-danger" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-brand-950 sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function CarDetailsPage({ params }: CarDetailsPageProps) {
  const { id } = await params;
  const car = getCarById(id);

  if (!car) notFound();

  const similar = getSimilarCars(car, 4);
  const status = STATUS_STYLES[car.status];
  const facts = [
    { label: "سنة الصنع", value: String(car.year) },
    { label: "الممشى", value: formatCarMileage(car.mileage) },
    { label: "ناقل الحركة", value: car.transmission },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16">
      <nav className="mb-5 flex items-center gap-1.5 text-[13px] text-neutral-500">
        <Link href="/" className="hover:text-brand-950">الرئيسية</Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <Link href="/cars" className="hover:text-brand-950">السيارات</Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <Link href={`/cars?brand=${encodeURIComponent(car.brand)}`} className="hover:text-brand-950">
          {car.brand}
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-brand-950">{car.model}</span>
      </nav>

      {/* Phones read top to bottom: photo, then price and contact, then details.
          On desktop the price box sits beside both, sticky while scrolling. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div>
          <CarGallery car={car} credits={car.images.map(getImageCredit)} />
        </div>

        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="rounded-3xl border border-black/[0.07] bg-white p-5 shadow-[0_24px_50px_-34px_rgba(11,19,34,0.5)] sm:p-6 lg:sticky lg:top-28">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", status.chip)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                {car.status}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-brand-900">
                {car.condition}
              </span>
              {car.origin && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-brand-900">
                  {originLabel(car.origin)}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-brand-950">
              <bdi>
                {car.brand} {car.model}
              </bdi>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              <bdi>{[car.trim, car.year, car.color].filter(Boolean).join(" · ")}</bdi>
            </p>

            <div className="mt-5 flex items-end justify-between gap-3 border-y border-black/[0.06] py-4">
              <div>
                <p className="text-xs font-normal text-neutral-500">السعر</p>
                <p className="mt-1 text-[30px] font-bold leading-none tracking-tight text-brand-950">
                  {formatNumber(car.price)} <span className="text-base font-semibold text-neutral-500">د.ع</span>
                </p>
              </div>
              <p className="pb-0.5 text-sm font-semibold text-neutral-500" dir="ltr">
                {formatUSD(car.price)}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-xl bg-surface px-2 py-2.5">
                  <dt className="text-[11px] text-neutral-500">{fact.label}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-bold text-brand-950">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <CarContactActions car={car} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Clock className="h-3.5 w-3.5" />
                {site.hours}
              </p>
              <CarFavoriteToggle id={car.id} compact />
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-10 lg:row-start-2">
          <CarHighlights car={car} />

          <Section title="عن السيارة">
            <p className="text-[15.5px] leading-8 text-neutral-600">{car.description}</p>
          </Section>

          {car.features.length > 0 && (
            <Section title="التجهيزات">
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {car.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-[14.5px] text-neutral-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <bdi>{feature}</bdi>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="المواصفات الكاملة">
            <CarSpecifications car={car} />
          </Section>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-brand-950 sm:text-2xl">سيارات قد تعجبك أيضاً</h2>
            <Link href="/cars" className="text-sm font-bold text-brand-600 hover:text-brand-950">
              كل السيارات
            </Link>
          </div>
          <CarGrid cars={similar} className="lg:grid-cols-4 xl:grid-cols-4" />
        </section>
      )}

      <MobileContactBar car={car} />
    </div>
  );
}
