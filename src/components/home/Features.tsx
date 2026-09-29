import { ShieldCheck, Tags, FileCheck2, Handshake, Layers } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "ضمان الجودة",
    subtitle: "مع فحص شامل لكل سيارة",
  },
  {
    icon: Tags,
    title: "أسعار منافسة",
    subtitle: "أفضل الأسعار في السوق",
  },
  {
    icon: FileCheck2,
    title: "إجراءات سهلة",
    subtitle: "تسهيل عملية الشراء",
  },
  {
    icon: Handshake,
    title: "تجربة مميزة",
    subtitle: "مع فريقنا المحترف",
  },
  {
    icon: Layers,
    title: "مجموعة واسعة",
    subtitle: "من مختلف الماركات والموديلات",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-5">
        {FEATURES.map(({ icon: Icon, title, subtitle }) => (
          <div key={title} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:gap-3 sm:text-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">{title}</p>
              <p className="text-xs text-neutral-500">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
