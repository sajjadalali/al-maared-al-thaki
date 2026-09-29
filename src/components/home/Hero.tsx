import Link from "next/link";
import { ClipboardCheck, MessageCircle, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { CategoryPills } from "@/components/cars/CategoryPills";
import { HeroChatPreview } from "@/components/home/HeroChatPreview";
import { OpenChatButton } from "@/components/chat/OpenChatButton";

const TRUST_BADGES = [
  { icon: ShieldCheck, text: "ضمان على السيارات" },
  { icon: ClipboardCheck, text: "فحص شامل قبل التسليم" },
  { icon: Wallet, text: "إمكانية التقسيط" },
];

export function Hero() {
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
            <OpenChatButton className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20">
              <MessageCircle className="h-4 w-4" />
              تحدث مع سديم
            </OpenChatButton>
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
          <HeroChatPreview />
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
