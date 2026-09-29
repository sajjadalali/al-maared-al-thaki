import type { Metadata } from "next";
import { ShieldCheck, Sparkles, Users, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "من نحن | المعرض الذكي",
  description: "تعرف على المعرض الذكي، منصة السيارات الذكية الأولى في العراق.",
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "الثقة والشفافية",
    text: "كل سيارة تمر بفحص شامل، وكل المعلومات المعروضة واضحة وصادقة من دون مفاجآت.",
  },
  {
    icon: Sparkles,
    title: "تقنية حديثة",
    text: "نستخدم الذكاء الاصطناعي عبر مساعدنا سديم لتسهيل رحلة البحث عن السيارة المناسبة.",
  },
  {
    icon: Users,
    title: "خدمة تتمحور حول العميل",
    text: "فريقنا موجود لمساعدتك في كل خطوة، من الاختيار إلى التسليم.",
  },
  {
    icon: Target,
    title: "أسعار عادلة",
    text: "نراجع السوق باستمرار لنقدم لك أفضل الأسعار المتاحة في العراق.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-brand-950 sm:text-4xl">من نحن</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-neutral-600">
          المعرض الذكي هو منصة عراقية تجمع بين معارض السيارات والعملاء في مكان واحد، وتوظف
          الذكاء الاصطناعي لتجعل رحلة البحث عن السيارة المناسبة أسرع وأسهل وأكثر وضوحاً. نؤمن أن
          شراء السيارة يجب أن يكون تجربة ممتعة لا مرهقة.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-brand-950">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-brand-950 p-8 text-center text-white sm:p-10">
        <h2 className="text-xl font-extrabold sm:text-2xl">رسالتنا</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-white/70">
          نسعى لأن نكون الوجهة الأولى لكل باحث عن سيارة في العراق، من خلال منصة موثوقة تجمع
          الشفافية والتقنية الحديثة وخدمة تليق بثقتكم بنا.
        </p>
      </div>
    </div>
  );
}
