"use client";

import { Check, Car as CarIcon, SendHorizontal, Sparkles, Zap } from "lucide-react";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { CarIllustration } from "@/components/ui/CarIllustration";
import { getAllCars, getCatalogStats, getFeaturedCars } from "@/data/cars";
import { formatIQD } from "@/lib/format";
import { openSadeemChat } from "@/lib/chatBus";
import type { Car } from "@/types/car";

const DEMO_BUDGET = 50_000_000;

// A real answer from the current catalog, so the preview never shows a car the
// showroom doesn't have.
function demoConversation(): { question: string; answer: string; car?: Car; withinBudget: boolean } {
  const familyCars = getAllCars()
    .filter((c) => c.status === "متوفرة" && c.seats >= 7 && c.price <= DEMO_BUDGET)
    .sort((a, b) => b.price - a.price);
  if (familyCars.length > 0) {
    return {
      question: "أريد سيارة عائلية 7 مقاعد بحدود 50 مليون",
      answer: `أكيد! لگيت ${familyCars.length} سيارات عائلية ضمن ميزانيتك، هاي أفضلها 👇`,
      car: familyCars[0],
      withinBudget: true,
    };
  }
  return {
    question: "شنو أفضل سيارة عندكم هسه؟",
    answer: "هاي من أكثر السيارات طلباً عدنا 👇",
    car: getFeaturedCars(1)[0] ?? getAllCars()[0],
    withinBudget: false,
  };
}

function MiniAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 ring-2 ring-white">
      <SadeemMascot className="h-5 w-5" />
    </span>
  );
}

export function HeroChatPreview() {
  const demo = demoConversation();
  const { available } = getCatalogStats();
  const car = demo.car;

  return (
    <div className="relative mx-auto w-full max-w-[440px] pt-16 lg:ms-auto lg:me-4">
      {/* backdrop: glow, dot grid and a tilted card behind the chat */}
      <div aria-hidden className="pointer-events-none absolute -inset-10">
        <div className="absolute inset-16 rounded-full bg-brand-400/35 blur-3xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.28)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(closest-side,black,transparent)]" />
      </div>
      <div
        aria-hidden
        className="absolute inset-x-6 bottom-[-12px] top-24 -rotate-[5deg] rounded-[28px] bg-white/10 ring-1 ring-white/15 backdrop-blur-sm"
      />

      {/* mascot with its speech bubble, as in the reference design */}
      <div className="absolute left-0 top-0 z-20 flex flex-row-reverse items-end gap-1 motion-safe:animate-float">
        <SadeemMascot className="h-24 w-24 drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]" />
        <div className="mb-10 rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-brand-950 shadow-xl">
          <p className="text-sm font-extrabold leading-5">أنا سديم 👋</p>
          <p className="text-[11px] font-medium text-neutral-500">موظف مبيعاتك الذكي</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openSadeemChat()}
        aria-label="افتح محادثة سديم"
        className="relative z-10 block w-full overflow-hidden rounded-[28px] bg-white text-start text-brand-950 shadow-2xl shadow-black/40 ring-1 ring-white/20 transition duration-300 hover:-translate-y-1 hover:shadow-black/50"
      >
        {/* header */}
        <div className="flex items-center justify-between bg-gradient-to-l from-brand-900 via-brand-800 to-brand-600 px-4 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/20">
              <SadeemMascot className="h-8 w-8" />
              <span className="absolute -end-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-brand-900 bg-success" />
              </span>
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-[15px] font-extrabold leading-5">
                سديم
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </p>
              <p className="text-[11.5px] text-white/70">متصل الآن · يرد فوراً</p>
            </div>
          </div>
        </div>

        {/* conversation */}
        <div className="space-y-3 bg-[#f2f5f9] px-4 pb-4 pt-4">
          <div className="flex justify-start motion-safe:animate-rise" style={{ animationDelay: "0.2s" }}>
            <p className="max-w-[82%] rounded-2xl rounded-tr-md bg-brand-900 px-3.5 py-2 text-[14.5px] font-medium leading-7 text-white shadow-sm">
              {demo.question}
            </p>
          </div>

          <div
            className="flex flex-row-reverse items-end justify-start gap-2 motion-safe:animate-rise"
            style={{ animationDelay: "0.8s" }}
          >
            <MiniAvatar />
            <p className="max-w-[82%] rounded-2xl rounded-tl-md border border-black/[0.04] bg-white px-3.5 py-2 text-[14.5px] font-medium leading-7 text-neutral-800 shadow-sm">
              {demo.answer}
            </p>
          </div>

          {car && (
            <div
              className="me-9 flex items-stretch gap-3 overflow-hidden rounded-2xl bg-white p-2 shadow-md ring-1 ring-black/[0.04] motion-safe:animate-rise"
              style={{ animationDelay: "1.4s" }}
            >
              <div className="relative flex w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950">
                <div className="absolute inset-x-3 bottom-2 h-6 rounded-full bg-brand-400/30 blur-md" />
                <CarIllustration className="relative w-[104px]" />
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-[14px] font-extrabold leading-5">
                  <bdi>
                    {car.brand} {car.model}
                  </bdi>{" "}
                  <span className="font-semibold text-neutral-500">{car.year}</span>
                </p>
                <p className="mt-0.5 text-[15px] font-extrabold text-brand-800">{formatIQD(car.price)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {demo.withinBudget && (
                    <span className="flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[10.5px] font-bold text-success">
                      <Check className="h-3 w-3" />
                      ضمن ميزانيتك
                    </span>
                  )}
                  <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-600">
                    {car.seats} مقاعد
                  </span>
                  <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-600">
                    {car.condition}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div
            className="flex flex-row-reverse items-center justify-start gap-2 motion-safe:animate-rise"
            style={{ animationDelay: "2s" }}
          >
            <MiniAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-sm">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-brand-400 motion-safe:animate-bounce-dot"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* mock input: the whole card opens the real chat */}
        <div className="flex items-center gap-2 border-t border-black/5 bg-white px-3 py-2.5">
          <span className="flex-1 rounded-full bg-surface px-4 py-2.5 text-[13.5px] text-neutral-400">
            اسأل سديم عن سيارتك...
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-white shadow-md">
            <SendHorizontal className="h-4 w-4 -scale-x-100" />
          </span>
        </div>
      </button>

      {/* floating facts */}
      <div className="absolute right-2 top-3 z-20 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-brand-950 shadow-xl motion-safe:animate-float-slow">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <Zap className="h-4 w-4" />
        </span>
        <span className="text-[12px] font-bold">يرد خلال ثوانٍ</span>
      </div>
      <div
        className="absolute -bottom-10 left-20 z-20 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-brand-950 shadow-xl motion-safe:animate-float"
        style={{ animationDelay: "1.5s" }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <CarIcon className="h-4 w-4" />
        </span>
        <span className="text-[12px] font-bold">
          <span className="text-[15px] font-extrabold text-brand-800">{available}</span> سيارة متوفرة الآن
        </span>
      </div>
    </div>
  );
}
