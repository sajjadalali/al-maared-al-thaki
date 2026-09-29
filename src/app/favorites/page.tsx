"use client";

import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { getCarById } from "@/data/cars";
import { CarGrid } from "@/components/cars/CarGrid";

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const cars = favorites
    .map((id) => getCarById(id))
    .filter((car): car is NonNullable<typeof car> => Boolean(car));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2">
        <Heart className="h-5 w-5 text-danger" />
        <h1 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">سياراتي المفضلة</h1>
      </div>

      {cars.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-white py-20 text-center">
          <Heart className="h-10 w-10 text-neutral-300" />
          <p className="text-base font-bold text-brand-950">لا توجد سيارات في المفضلة بعد</p>
          <p className="max-w-sm text-sm text-neutral-500">
            اضغط على أيقونة القلب في أي سيارة تعجبك لتضيفها هنا وترجع لها بسهولة لاحقاً.
          </p>
          <Link
            href="/cars"
            className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
          >
            <ArrowLeft className="h-4 w-4" />
            تصفح السيارات
          </Link>
        </div>
      ) : (
        <CarGrid cars={cars} />
      )}
    </div>
  );
}
