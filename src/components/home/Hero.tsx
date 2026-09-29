"use client";

import Link from "next/link";
import {
  Bot,
  ClipboardCheck,
  Fuel,
  Gauge,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { CategoryPills } from "@/components/cars/CategoryPills";
import { CarImage } from "@/components/ui/CarImage";
import { getAllCars, getFeaturedCars } from "@/data/cars";
import { formatIQD, formatNumber } from "@/lib/format";
import { openSadeemChat } from "@/lib/chatBus";

const DEMO_BUDGET = 50_000_000;

// A real answer from the current catalog, so the preview never shows a car the
// showroom doesn't have.
function demoConversation() {
  const familyCars = getAllCars()
    .filter((c) => c.status === "متوفرة" && c.seats >= 7 && c.price <= DEMO_BUDGET)
    .sort((a, b) => b.price - a.price);
  if (familyCars.length > 0) {
    return {
      question: "أريد سيارة عائلية 7 مقاعد بحدود 50 مليون",
      answer: `أكيد! لگيت ${familyCars.length} سيارات عائلية ضمن ميزانيتك، هاي أفضلها:`,
      car: familyCars[0],
    };
  }
  const car = getFeaturedCars(1)[0] ?? getAllCars()[0];
  return {
    question: "شنو أفضل سيارة عندكم هسه؟",
    answer: "هاي من أكثر السيارات طلباً عدنا:",
    car,
  };
}

const TRUST_BADGES = [
  { icon: ShieldCheck, text: "ضمان على السيارات" },
  { icon: ClipboardCheck, text: "فحص شامل قبل التسليم" },
  { icon: Wallet, text: "إمكانية التقسيط" },
];

export function Hero() {
  const demo = demoConversation();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-24 -end-24 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="absolute -bottom-32 -start-16 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-12 pb-24 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-16 lg:pb-28 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            مدعوم بالذكاء الاصطناعي
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            اكتشف سيارتك المثالية
          </h1>
          <p className="mt-4 max-w-lg text-base leading-8 text-white/70 sm:text-lg">
            اختر من بين السيارات الجديدة والمستعملة بأفضل الأسعار، واترك لسديم، مساعدك الذكي،
            مهمة ترشيح السيارة الأنسب لميزانيتك واحتياجك خلال ثوانٍ.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Link
              href="/cars"
              className="rounded-xl bg-white px-6 py-3 text-center text-sm font-bold text-brand-900 shadow-lg shadow-black/10 transition hover:bg-white/90"
            >
              تصفح السيارات
            </Link>
            <button
              type="button"
              onClick={() => openSadeemChat()}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <MessageCircle className="h-4 w-4" />
              تحدث مع سديم
            </button>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/75">
            {TRUST_BADGES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-white/60" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => openSadeemChat()}
            aria-label="افتح محادثة سديم"
            className="block w-full max-w-md overflow-hidden rounded-3xl bg-white text-start text-brand-950 shadow-2xl shadow-black/30 ring-1 ring-white/10 transition hover:-translate-y-0.5 lg:ms-auto"
          >
            <div className="flex items-center gap-2.5 bg-brand-900 px-4 py-3 text-white">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-4.5 w-4.5" />
                <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-900 bg-success" />
              </span>
              <div>
                <p className="text-sm font-extrabold">سديم</p>
                <p className="text-[11px] text-white/70">متصل الآن — مساعد المبيعات الذكي</p>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-tl-sm bg-brand-900 px-3.5 py-2 text-sm leading-7 text-white">
                  {demo.question}
                </p>
              </div>
              <div className="flex items-end gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm border border-black/5 bg-surface px-3.5 py-2 text-sm leading-7">
                  {demo.answer}
                </p>
              </div>

              {demo.car && (
                <div className="ms-9 flex gap-3 overflow-hidden rounded-xl border border-black/5 bg-white p-2 shadow-sm">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-brand-900">
                    <CarImage
                      src={demo.car.images[0]}
                      alt={`${demo.car.brand} ${demo.car.model}`}
                      sizes="112px"
                      className="[&_span]:hidden [&_svg]:h-7 [&_svg]:w-7"
                    />
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="truncate text-sm font-extrabold">
                      {demo.car.brand} {demo.car.model} {demo.car.year}
                    </p>
                    <p className="text-sm font-extrabold text-brand-800">{formatIQD(demo.car.price)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-2.5 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3 text-brand-600" />
                        {demo.car.engine}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-3 w-3 text-brand-600" />
                        {demo.car.transmission}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-brand-600" />
                        {formatNumber(demo.car.mileage)} كم
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-black/5 px-4 py-3 text-center text-sm font-bold text-brand-800">
              جرّب سديم الآن ←
            </div>
          </button>
        </div>
      </div>

      <div className="relative mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <CarQuickSearch />
        <div className="mt-4">
          <CategoryPills />
        </div>
      </div>
    </section>
  );
}
