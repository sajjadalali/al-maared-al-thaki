"use client";

import { Car, MessageCircle, ShieldCheck, ClipboardCheck, Wallet, Sparkles } from "lucide-react";
import Link from "next/link";
import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { CategoryPills } from "@/components/cars/CategoryPills";
import { openSadeemChat } from "@/lib/chatBus";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-24 -end-24 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="absolute -bottom-32 -start-16 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-12 pb-24 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-16 lg:pb-32 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            مدعوم بالذكاء الاصطناعي
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            اكتشف سيارتك المثالية
          </h1>
          <p className="mt-4 max-w-lg text-base leading-8 text-white/70 sm:text-lg">
            اختر من بين مئات السيارات الجديدة والمستعملة بأفضل الأسعار، وخدمات موثوقة تناسب
            احتياجاتك، مع سديم مساعدك الذكي جاهز يساعدك تلگى سيارتك بأسرع وقت.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/cars"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-900 shadow-lg shadow-black/10 transition hover:bg-white/90"
            >
              تصفح السيارات
            </Link>
            <button
              type="button"
              onClick={() => openSadeemChat()}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <MessageCircle className="h-4 w-4" />
              تحدث مع سديم
            </button>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative flex aspect-[4/3] items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <Car className="h-40 w-40 text-white/20" strokeWidth={1} />

            <div className="absolute start-5 top-5 flex flex-col gap-2.5">
              <FloatingBadge icon={<ShieldCheck className="h-4 w-4" />} text="ضمان على جميع السيارات" />
              <FloatingBadge icon={<ClipboardCheck className="h-4 w-4" />} text="فحص شامل قبل التسليم" />
              <FloatingBadge icon={<Wallet className="h-4 w-4" />} text="إمكانية التقسيط" />
            </div>

            <div className="absolute -bottom-5 end-8 rounded-2xl bg-white px-5 py-3 text-brand-950 shadow-xl">
              <p className="text-lg font-extrabold">+500</p>
              <p className="text-xs font-medium text-neutral-500">سيارة متوفرة الآن</p>
            </div>
          </div>
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

function FloatingBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-bold text-brand-900 shadow-lg">
      {icon}
      {text}
    </div>
  );
}
