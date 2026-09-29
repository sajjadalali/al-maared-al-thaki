import Link from "next/link";
import { Car, Award, MapPin } from "lucide-react";
import { getCatalogStats } from "@/data/cars";

export function StatsBanner() {
  const { available, brands, cities } = getCatalogStats();
  const stats = [
    { icon: Car, value: available, label: "سيارة متوفرة" },
    { icon: Award, value: brands, label: "ماركة" },
    { icon: MapPin, value: cities, label: "محافظة" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-8 rounded-3xl bg-brand-900 px-6 py-10 text-white sm:flex-row sm:justify-between sm:px-10">
        <div className="text-center sm:text-start">
          <h3 className="text-xl font-extrabold sm:text-2xl">
            سيارتك القادمة أقرب مما تتخيل
          </h3>
          <p className="mt-2 max-w-md text-sm text-white/70">
            تصفّح السيارات بنفسك، أو اطلب من سديم أن يرشّح لك الأنسب حسب ميزانيتك واحتياجك.
          </p>
          <Link
            href="/cars"
            className="mt-5 inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-900 transition hover:bg-white/90"
          >
            ابدأ الآن
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-lg font-extrabold">{value}</p>
              <p className="text-xs text-white/60">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
