import Link from "next/link";
import { ArrowLeft, BadgeCheck, ClipboardCheck, FileCheck2, Sparkles, Wallet } from "lucide-react";
import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { CarArt } from "@/components/ui/CarArt";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { getAllCars, getCatalogStats, getFeaturedCars, toFacetCar } from "@/data/cars";
import { formatNumber, originLabel } from "@/lib/format";

const TRUST = [
  { icon: ClipboardCheck, text: "فحص فني قبل البيع" },
  { icon: Wallet, text: "إمكانية التقسيط" },
  { icon: FileCheck2, text: "تسجيل ونقل ملكية" },
];

// The showcase is a real car from the stock: the first featured 4x4, the
// segment Iraqi buyers ask for most, or any featured car.
function showcaseCar() {
  const featured = getFeaturedCars().filter((car) => car.status === "متوفرة");
  return featured.find((car) => car.bodyType === "دفع رباعي") ?? featured[0];
}

export function Hero() {
  const { available } = getCatalogStats();
  const car = showcaseCar();

  return (
    <section className="relative overflow-hidden bg-surface">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 start-1/3 h-[520px] w-[820px] rounded-full bg-white blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface-muted/70" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8 lg:pb-32 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-brand-900 shadow-sm ring-1 ring-black/5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {available} سيارة متوفرة الآن في المعرض
          </span>

          <h1 className="mt-5 text-[34px] font-bold leading-[1.25] text-brand-950 sm:text-5xl sm:leading-[1.2] lg:text-[56px]">
            سيارات مفحوصة
            <br />
            بأسعار{" "}
            <span className="relative inline-block">
              <span className="relative z-10">واضحة</span>
              <span aria-hidden className="absolute inset-x-0 bottom-1 h-3 rounded-full bg-accent-300/70 sm:bottom-2 sm:h-4" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-neutral-600 sm:text-lg sm:leading-9">
            جديدة ومستعملة، وكالة ووارد خليجي وأمريكي وكوري. تصفّح المعرض بنفسك، أو اسأل سديم،
            مساعدنا الذكي، ليرشّح لك الأنسب لميزانيتك خلال ثوانٍ.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/cars"
              className="flex items-center justify-center gap-2 rounded-full bg-brand-950 px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-brand-950/20 transition hover:bg-brand-800"
            >
              تصفّح السيارات
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <OpenChatButton className="flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-brand-950 ring-1 ring-black/10 transition hover:ring-black/20">
              <Sparkles className="h-4 w-4 text-accent-500" />
              اسأل سديم
            </OpenChatButton>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[13.5px] font-semibold text-neutral-600">
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-brand-500" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {car && (
          <div className="relative mt-12 lg:mt-0">
            <Link
              href={`/cars/${car.id}`}
              className="group relative block overflow-hidden rounded-[32px] bg-[radial-gradient(110%_80%_at_50%_0%,#ffffff_0%,#f1f3f6_55%,#e3e6eb_100%)] shadow-[0_40px_80px_-40px_rgba(11,19,34,0.45)] ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between px-6 pt-6">
                <span className="flex items-center gap-1.5 rounded-full bg-brand-950 px-3 py-1 text-xs font-bold text-white">
                  <BadgeCheck className="h-3.5 w-3.5 text-accent-400" />
                  من مختارات المعرض
                </span>
                <span className="text-xs font-semibold text-neutral-500">
                  {car.condition === "جديدة" ? "جديدة · زيرو" : car.condition}
                  {car.origin && ` · ${originLabel(car.origin)}`}
                </span>
              </div>

              <div aria-hidden className="absolute inset-x-10 bottom-[104px] h-16 rounded-[50%] bg-brand-950/[0.06] blur-md" />
              <CarArt
                bodyType={car.bodyType}
                color={car.color}
                className="relative mx-auto mt-4 w-[92%] transition duration-700 group-hover:-translate-x-2"
              />

              <div className="relative m-3 mt-2 flex items-center justify-between gap-4 rounded-[22px] bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-6 text-brand-950 sm:text-base">
                    <bdi>
                      {car.brand} {car.model}
                    </bdi>
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    <bdi>{[car.trim, car.year].filter(Boolean).join(" · ")}</bdi> · {car.engine.split(" ")[0]}{" "}
                    {car.fuel}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-lg font-bold leading-6 text-brand-950">
                    {formatNumber(car.price)} <span className="text-xs font-semibold text-neutral-500">د.ع</span>
                  </p>
                  <p className="flex items-center justify-end gap-1 text-xs font-bold text-brand-600">
                    التفاصيل
                    <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
                  </p>
                </div>
              </div>
            </Link>

            <OpenChatButton className="absolute -top-14 end-2 z-10 flex max-w-[270px] items-end gap-2 text-start motion-safe:animate-float sm:end-6 lg:-end-3">
              <span className="rounded-2xl rounded-ee-md bg-brand-950 px-3.5 py-2.5 text-[13px] font-semibold leading-6 text-white shadow-xl shadow-brand-950/25">
                هلا! گلّي ميزانيتك وأني ألگيلك الأنسب 👋
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5">
                <SadeemMascot className="h-9 w-9" />
              </span>
            </OpenChatButton>
          </div>
        )}
      </div>

      <div className="relative mx-auto -mt-16 max-w-7xl px-4 pb-4 sm:px-6 lg:-mt-20 lg:px-8">
        <CarQuickSearch cars={getAllCars().map(toFacetCar)} />
      </div>
    </section>
  );
}
