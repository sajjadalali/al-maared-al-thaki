import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { getCarById, getSimilarCars } from "@/data/cars";
import { formatIQD } from "@/lib/format";
import { CarGallery } from "@/components/cars/CarGallery";
import { CarSpecifications } from "@/components/cars/CarSpecifications";
import { CarContactActions } from "@/components/cars/CarContactActions";
import { CarFavoriteToggle } from "@/components/cars/CarFavoriteToggle";
import { CarGrid } from "@/components/cars/CarGrid";

interface CarDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CarDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const car = getCarById(id);
  if (!car) return { title: "السيارة غير موجودة" };
  return {
    title: `${car.brand} ${car.model} ${car.year}`,
    description: car.description,
  };
}

const STATUS_STYLES: Record<string, string> = {
  متوفرة: "bg-success/10 text-success",
  محجوزة: "bg-warning/10 text-warning",
  مباعة: "bg-danger/10 text-danger",
};

export default async function CarDetailsPage({ params }: CarDetailsPageProps) {
  const { id } = await params;
  const car = getCarById(id);

  if (!car) notFound();

  const similar = getSimilarCars(car, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-neutral-500">
        <Link href="/" className="hover:text-brand-900">الرئيسية</Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <Link href="/cars" className="hover:text-brand-900">السيارات</Link>
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="text-brand-900">{car.brand} {car.model}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CarGallery car={car} />

          <div className="mt-8">
            <h2 className="mb-3 text-lg font-extrabold text-brand-950">المواصفات</h2>
            <CarSpecifications car={car} />
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-lg font-extrabold text-brand-950">الوصف</h2>
            <p className="leading-8 text-neutral-600">{car.description}</p>
          </div>

          {car.features.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-extrabold text-brand-950">المواصفات الإضافية</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {car.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[car.status]}`}
              >
                {car.status}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-brand-900">
                {car.condition}
              </span>
            </div>

            <h1 className="mt-2 text-xl font-extrabold text-brand-950">
              {car.brand} {car.model} {car.year}
            </h1>
            <p className="mt-1 text-2xl font-extrabold text-brand-800">{formatIQD(car.price)}</p>

            <div className="mt-4">
              <CarFavoriteToggle id={car.id} />
            </div>

            <hr className="my-5 border-black/5" />

            <CarContactActions car={car} />
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 text-xl font-extrabold text-brand-950">سيارات مشابهة</h2>
          <CarGrid cars={similar} />
        </div>
      )}
    </div>
  );
}
