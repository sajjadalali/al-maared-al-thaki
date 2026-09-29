import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { site, phoneHref, whatsappHref } from "@/config/site";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: `تواصل مع فريق ${site.name} عبر الهاتف أو واتساب أو البريد الإلكتروني.`,
};

const INFO = [
  { icon: Phone, label: "الهاتف", value: site.phone, href: phoneHref, dir: "ltr" as const },
  { icon: WhatsappIcon, label: "واتساب", value: site.phone, href: whatsappHref(), dir: "ltr" as const },
  { icon: Mail, label: "البريد الإلكتروني", value: site.email, href: `mailto:${site.email}`, dir: "ltr" as const },
  { icon: MapPin, label: "العنوان", value: site.address },
  { icon: Clock, label: "أوقات العمل", value: site.hours },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-brand-950 sm:text-4xl">تواصل معنا</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
          لديك استفسار أو تحتاج مساعدة في اختيار سيارتك؟ فريقنا جاهز لخدمتك، ويمكنك أيضاً التحدث
          مع سديم مساعدنا الذكي في أي وقت.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {INFO.map(({ icon: Icon, label, value, href, dir }) => {
              const body = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-xs text-neutral-500">{label}</p>
                    <p className="text-sm font-bold text-brand-950" dir={dir}>
                      {value}
                    </p>
                  </div>
                </>
              );
              const cls =
                "flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm";
              return href ? (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`${cls} transition hover:border-brand-200`}
                >
                  {body}
                </a>
              ) : (
                <div key={label} className={cls}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
