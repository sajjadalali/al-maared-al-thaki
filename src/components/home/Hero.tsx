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
  const { available, brands } = catalog.getCatalogStats();
  const prices = catalog
    .getAllCars()
    .filter((car) => car.status === "متوفرة")
    .map((car) => car.price);
  const from = prices.length ? millions(Math.min(...prices)) : null;
  const to = prices.length ? millions(Math.max(...prices)) : null;
  const quickSearchCars = catalog.getAllCars().map(toFacetCar);

  return (
    // Pulled up under the header, which lies on the hero's ink until the page scrolls.
    // Computers (20 Nov): less space above and below the road, so the search
    // under it is whole on a 1440×900 screen (it was cut 43 px at the bottom).
    <section data-hero className="relative -mt-[68px] bg-brand-950 lg:-mt-[76px]">
      <div className="relative isolate overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl items-center gap-x-12 gap-y-12 px-4 pb-14 pt-28 sm:px-6 lg:pb-24 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:px-8 lg:pb-16 lg:pt-24">
          <div className="max-w-xl text-white">
            <h1 className="text-[36px] font-bold leading-[1.22] sm:text-5xl sm:leading-[1.2] lg:text-[60px] lg:leading-[1.18]">
              سيارتك المناسبة
              <br />
              بأقصر طريق
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/75 sm:text-lg sm:leading-9">
              المعرض الذكي بيه سديم، مساعدك الشخصي لشراء السيارة. تحچي وياه بكلامك، يجيبلك اللي يناسبك من سياراتنا،
              يقارنلك ويحللك الفرق، ويبقى وياك لحد ما تاخذ سيارتك المناسبة.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <OpenChatButton className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-brand-950 transition hover:bg-white/90">
                <Sparkles className="h-4 w-4 text-accent-500" />
                احچي ويا سديم
              </OpenChatButton>
              <Link
                href="/cars"
                className="flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-bold text-white ring-1 ring-white/40 transition hover:bg-white/10"
              >
                تصفّح السيارات
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-7 flex items-center gap-2.5 text-[14px] text-white/70">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  {carCount(available)} {available === 2 ? "متوفرتين" : "متوفرة"} هسه
                </span>
                {from && to && `، من ${from} لحد ${to} مليون دينار.`}
              </span>
            </p>

            {/* Phones and tablets (21 Nov): the search right under the buttons.
                Under the road it was about two screens down on a phone. */}
            <div data-hero-search className="mt-8 text-brand-950 lg:hidden">
              <CarQuickSearch cars={quickSearchCars} />
            </div>
          </div>

          <HeroInfographic available={available} brands={brands} />
        </div>
      </div>

      {/* Computers: the search straddles the hero's lower edge and the page below it. */}
      <div className="hidden bg-white lg:block">
        <div data-hero-search className="relative z-10 mx-auto -mt-14 max-w-7xl px-8 pb-2">
          <CarQuickSearch cars={quickSearchCars} />
        </div>
      </div>
    </section>
  );
}
