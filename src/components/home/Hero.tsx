import Link from "next/link";
import { getImageProps } from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { toFacetCar } from "@/data/cars";
import { getCatalog } from "@/server/catalog";
import { carCount } from "@/lib/format";
import { HERO_PHOTO } from "@/data/sitePhotos";

// The hall photo, cropped twice: wide for screens beside the text, taller for
// phones where the text sits under the aisle. Credited on /credits.
const PHOTO = HERO_PHOTO;

/** 18,500,000 → "18.5", 160,000,000 → "160". */
const millions = (iqd: number) => String(Math.round(iqd / 100_000) / 10);

function HeroPhoto() {
  const common = { alt: PHOTO.alt, sizes: "100vw" };
  const {
    props: { srcSet: wide },
  } = getImageProps({ ...common, src: "/home/hall-wide.webp", width: 2400, height: 1417, quality: 72 });
  const {
    props: { srcSet: tall, ...rest },
  } = getImageProps({ ...common, src: "/home/hall-tall.webp", width: 1100, height: 1076, quality: 70 });

  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={wide} />
      <source srcSet={tall} />
      <img
        {...rest}
        alt={PHOTO.alt}
        loading="eager"
        fetchPriority="high"
        className="absolute inset-x-0 top-0 h-[440px] w-full object-cover object-[50%_85%] sm:h-[520px] lg:inset-0 lg:h-full lg:object-[30%_55%]"
      />
    </picture>
  );
}

export async function Hero() {
  const catalog = await getCatalog();
  const { available } = catalog.getCatalogStats();
  const prices = catalog
    .getAllCars()
    .filter((car) => car.status === "متوفرة")
    .map((car) => car.price);
  const from = prices.length ? millions(Math.min(...prices)) : null;
  const to = prices.length ? millions(Math.max(...prices)) : null;

  return (
    // Pulled up under the header, which lies on the photo until the page scrolls.
    <section className="relative -mt-[68px] bg-brand-950 lg:-mt-[76px]">
      <div className="relative isolate overflow-hidden">
        <HeroPhoto />
        <div aria-hidden className="absolute inset-0 -z-0">
          {/* the header's white text on the hall's light ceiling */}
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-brand-950/80 to-transparent" />
          {/* phones: the photo ends in the page's ink, the text sits under it */}
          <div className="absolute inset-x-0 top-[300px] h-[141px] bg-gradient-to-b from-transparent to-brand-950 sm:top-[360px] sm:h-[161px] lg:hidden" />
          {/* wide screens: the text side darkens, the aisle stays bright */}
          <div className="absolute inset-0 hidden bg-[linear-gradient(to_left,rgba(11,19,34,0.94)_0%,rgba(11,19,34,0.82)_34%,rgba(11,19,34,0.25)_66%,rgba(11,19,34,0)_86%)] lg:block" />
          <div className="absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-brand-950 to-transparent lg:block" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col px-4 pb-24 pt-[410px] sm:px-6 sm:pt-[490px] lg:min-h-[720px] lg:justify-center lg:px-8 lg:pb-32 lg:pt-32">
          <div className="max-w-xl text-white">
            <h1 className="text-[36px] font-bold leading-[1.18] sm:text-5xl lg:text-[64px] lg:leading-[1.12]">
              سيارات مفحوصة،
              <br />
              بأسعار واضحة
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/75 sm:text-lg sm:leading-9">
              جديدة ومستعملة، وكالة ووارد خليجي وأمريكي وكوري. تصفّح المعرض بنفسك، أو اسأل سديم، مساعدنا الذكي،
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
        </div>

        <Link
          href="/credits"
          className="absolute end-4 top-[408px] z-10 text-[11px] text-white/45 transition hover:text-white/80 sm:end-6 sm:top-[488px] lg:bottom-20 lg:end-8 lg:top-auto"
        >
          الصورة: <bdi>{PHOTO.author}</bdi>، <bdi>{PHOTO.license}</bdi>
        </Link>
      </div>

      {/* The search straddles the photo's lower edge and the page below it. */}
      <div className="bg-white">
        <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 pb-2 sm:px-6 lg:-mt-14 lg:px-8">
          <CarQuickSearch cars={catalog.getAllCars().map(toFacetCar)} />
        </div>
      </div>
    </section>
  );
}
