import { ClipboardCheck, FileCheck2, Repeat, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/home/SectionHeading";

const SERVICES = [
  {
    icon: ClipboardCheck,
    title: "فحص فني قبل البيع",
    text: "نفحص المحرك وناقل الحركة والهيكل والطلاء لكل سيارة، ونخبرك بحالتها بوضوح قبل أن تقرر.",
  },
  {
    icon: Wallet,
    title: "تقسيط عبر المصارف",
    text: "نساعدك بإجراءات التمويل مع المصارف المعتمدة، بدفعة أولى وأقساط تناسب دخلك.",
  },
  {
    icon: Repeat,
    title: "استبدال سيارتك",
    text: "أحضر سيارتك الحالية، نقيّمها ونخصم قيمتها من سعر سيارتك الجديدة.",
  },
  {
    icon: FileCheck2,
    title: "تسجيل ونقل ملكية",
    text: "نتابع معك أوراق المرور والتسجيل ونقل الملكية حتى تستلم سيارتك جاهزة.",
  },
];

export function Features() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading eyebrow="خدماتنا" title="من الاختيار إلى التسليم، نحن معك" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-black/[0.06]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-950 text-accent-300">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base font-bold text-brand-950">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
