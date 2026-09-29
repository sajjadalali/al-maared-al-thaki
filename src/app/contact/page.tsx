import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "تواصل معنا | المعرض الذكي",
  description: "تواصل مع فريق المعرض الذكي عبر الهاتف أو البريد الإلكتروني أو النموذج أدناه.",
};

const INFO = [
  { icon: Phone, label: "الهاتف", value: "+964 770 123 4567", dir: "ltr" as const },
  { icon: Mail, label: "البريد الإلكتروني", value: "info@autopro.iq", dir: "ltr" as const },
  { icon: MapPin, label: "العنوان", value: "بغداد، شارع فلسطين، العراق" },
  { icon: Clock, label: "أوقات العمل", value: "السبت - الخميس: 9 صباحاً - 7 مساءً" },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-brand-950 sm:text-4xl">تواصل معنا</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
          عندك استفسار أو تحتاج مساعدة باختيار سيارتك؟ فريقنا جاهز، أو تكدر تسولف مع سديم
          مساعدنا الذكي على مدار الساعة.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {INFO.map(({ icon: Icon, label, value, dir }) => (
              <div key={label} className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xs text-neutral-500">{label}</p>
                  <p className="text-sm font-bold text-brand-950" dir={dir}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
