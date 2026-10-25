import type { Metadata } from "next";
import Link from "next/link";
import { getAllCars } from "@/data/cars";
import { getImageCredit } from "@/data/imageCredits";

export const metadata: Metadata = {
  title: "حقوق الصور",
  description: "مصادر صور السيارات المعروضة في الموقع وأسماء المصوّرين ورخص الاستخدام.",
};

export default function CreditsPage() {
  const rows = getAllCars().flatMap((car) =>
    car.images.flatMap((src, i) => {
      const credit = getImageCredit(src);
      return credit ? [{ car, src, n: i + 1, credit }] : [];
    })
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-bold text-brand-950">حقوق الصور</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-8 text-neutral-600">
        بعض صور السيارات في الموقع صور توضيحية للموديل نفسه من ويكيميديا كومنز، منشورة برخص المشاع
        الإبداعي التي تسمح باستخدامها مع ذكر المصوّر والرخصة. اللون والتجهيزات في الصورة قد تختلف عن
        السيارة المعروضة في المعرض.
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-6 text-sm text-neutral-500">
          لا توجد حالياً صور تحتاج إلى إسناد.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-black/[0.06] rounded-2xl ring-1 ring-black/[0.07]">
          {rows.map(({ car, src, n, credit }) => (
            <li key={src} className="flex flex-col gap-1 px-5 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/cars/${car.id}`} className="font-semibold text-brand-950 hover:underline">
                <bdi>
                  {car.brand} {car.model} {car.year}
                </bdi>{" "}
                <span className="font-normal text-neutral-500">· صورة {n}</span>
              </Link>
              <span className="text-neutral-600">
                <a href={credit.source} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  <bdi>{credit.author}</bdi>
                </a>{" "}
                ·{" "}
                {credit.licenseUrl ? (
                  <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    <bdi>{credit.license}</bdi>
                  </a>
                ) : (
                  <bdi>{credit.license}</bdi>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
