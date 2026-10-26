import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles, Users, Target } from "lucide-react";
import { getAllCars, getCatalogStats } from "@/data/cars";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "من نحن",
  description: `تعرف على ${site.name}، معرض سيارات جديدة ومستعملة في العراق مع مساعد مبيعات ذكي.`,
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "الثقة والشفافية",
    text: "كل سيارة تمر بفحص شامل، وكل المعلومات المعروضة واضحة وصادقة: الوارد والممشى والحالة والسعر.",
  },
  {
    icon: Target,
    title: "أسعار معلنة",
    text: "السعر مكتوب على كل سيارة بالدينار العراقي، ونراجع السوق باستمرار لنبقى ضمن أفضل الأسعار.",
  },
  {
    icon: Sparkles,
    title: "تقنية حديثة",
    text: "مساعدنا الذكي سديم يجيبك في أي وقت ويرشّح لك من سيارات المعرض حسب ميزانيتك واحتياجك.",
  },
  {
    icon: Users,
    title: "خدمة حتى التسليم",
    text: "فريقنا معك في كل خطوة، من الاختيار وتجربة القيادة إلى التمويل والتسجيل ونقل الملكية.",
  },
];

export default function AboutPage() {
  const { available, brands } = getCatalogStats();
  const fresh = getAllCars().filter((car) => car.condition === "جديدة" && car.status !== "مباعة").length;
  const stats = [
    { value: available, label: "سيارة متوفرة الآن" },
    { value: brands, label: "ماركة في المعرض" },
    { value: fresh, label: "سيارة جديدة زيرو" },
  ];

  return (
    <div>
      <div className="bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
          <p className="text-[13px] font-bold text-accent-600">من نحن</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-brand-950 sm:text-5xl">
            معرض سيارات، بطريقة أوضح
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-neutral-600 sm:text-lg sm:leading-9">
            {site.name} معرض سيارات جديدة ومستعملة في {site.city}، يعرض كل سيارة بسعرها
            ومواصفاتها الحقيقية، ويوظّف الذكاء الاصطناعي ليجعل رحلة البحث عن سيارتك أسرع وأسهل. نؤمن
            أن شراء السيارة يجب أن يكون تجربة مريحة لا مرهقة.
          </p>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white px-3 py-5 ring-1 ring-black/[0.06]">
                <p className="text-3xl font-bold text-brand-950">{stat.value}</p>
                <p className="mt-1 text-xs font-normal text-neutral-500 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl p-6 ring-1 ring-black/[0.07]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-950 text-accent-300">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-base font-bold text-brand-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-500">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-5 rounded-[28px] bg-brand-950 p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">رسالتنا</h2>
          <p className="max-w-2xl text-[15px] leading-8 text-white/65">
            أن نكون الوجهة الأولى لكل باحث عن سيارة في العراق، بمعرض موثوق يجمع الشفافية والتقنية
            الحديثة وخدمة تليق بثقتكم.
          </p>
          <Link
            href="/cars"
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-950 transition hover:bg-white/90"
          >
            تصفّح السيارات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
