import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { toFacetCar } from "@/data/cars";
import { getCatalog } from "@/server/catalog";
import { carCount } from "@/lib/format";
import { HeroInfographic } from "@/components/home/HeroInfographic";

/** 18,500,000 → "18.5", 160,000,000 → "160". */
const millions = (iqd: number) => String(Math.round(iqd / 100_000) / 10);

export async function Hero() {
  const catalog = await getCatalog();
  const { available, brands, cities } = catalog.getCatalogStats();
  const prices = catalog
    .getAllCars()
    .filter((car) => car.status === "متوفرة")
    .map((car) => car.price);
  const from = prices.length ? millions(Math.min(...prices)) : null;
  const to = prices.length ? millions(Math.max(...prices)) : null;

  return (
    // Pulled up under the header, which lies on the hero's ink until the page scrolls.
    <section className="relative -mt-[68px] bg-brand-950 lg:-mt-[76px]">
      <div className="relative isolate overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl items-center gap-x-12 gap-y-12 px-4 pb-24 pt-28 sm:px-6 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:px-8 lg:pb-28 lg:pt-28">
          <div className="max-w-xl text-white">
            <h1 className="text-[36px] font-bold leading-[1.18] sm:text-5xl lg:text-[64px] lg:leading-[1.12]">
              سيارات مفحوصة،
              <br />
              بأسعار واضحة
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/75 sm:text-lg sm:leading-9">
              جديدة ومستعملة، وكالة ووارد خليجي وأمريكي وكوري. تصفّح المعرض بنفسك، أو اسأل سديم، موظف المبيعات أونلاين،
              ليرشّح لك الأنسب لميزانيتك خلال ثوانٍ.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/cars"
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-brand-950 transition hover:bg-white/90"
              >
                تصفّح السيارات
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <OpenChatButton className="flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-bold text-white ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-white/10">
                <Sparkles className="h-4 w-4 text-accent-300" />
                اسأل سديم
              </OpenChatButton>
            </div>

            <p className="mt-7 flex items-center gap-2.5 text-[14px] text-white/70">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  {carCount(available)} {available === 2 ? "متوفرتان" : "متوفرة"} الآن
                </span>
                {from && to && `، من ${from} إلى ${to} مليون دينار.`}
              </span>
            </p>
          </div>

          <HeroInfographic available={available} brands={brands} cities={cities} />
        </div>
      </div>

      {/* The search straddles the hero's lower edge and the page below it. */}
      <div className="bg-white">
        <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 pb-2 sm:px-6 lg:-mt-14 lg:px-8">
          <CarQuickSearch cars={catalog.getAllCars().map(toFacetCar)} />
        </div>
      </div>
    </section>
  );
}
