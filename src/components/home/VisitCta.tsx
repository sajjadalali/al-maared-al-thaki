import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { CarArt } from "@/components/ui/CarArt";
import { site, phoneHref, whatsappHref } from "@/config/site";

const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;

export function VisitCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-brand-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-24 -start-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
        </div>
        <div className="relative grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:p-14">
          <div>
            <h2 className="text-2xl font-bold sm:text-[32px] sm:leading-tight">زورونا في المعرض</h2>
            <p className="mt-3 max-w-md text-[15px] leading-8 text-white/65">
              شاهد السيارة بنفسك وجرّب قيادتها مع فريق المبيعات. نسعد بزيارتك، ويمكنك حجز موعد مسبقاً
              على واتساب.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4.5 w-4.5 shrink-0 text-accent-300" />
                {site.address}
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-4.5 w-4.5 shrink-0 text-accent-300" />
                {site.hours}
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4.5 w-4.5 shrink-0 text-accent-300" />
                <span dir="ltr">{site.phone}</span>
              </li>
            </ul>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={whatsappHref("مرحباً، أريد حجز موعد لزيارة المعرض")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-[#1fa855] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1a9149]"
              >
                <WhatsappIcon className="h-4 w-4" />
                احجز موعد زيارة
              </a>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                <Navigation className="h-4 w-4" />
                الاتجاهات على الخريطة
              </a>
              <a
                href={phoneHref}
                className="flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white/80 transition hover:text-white"
              >
                <Phone className="h-4 w-4" />
                اتصال
              </a>
            </div>
          </div>

          <div aria-hidden className="relative hidden lg:block">
            <div className="absolute inset-x-8 bottom-6 h-10 rounded-[50%] bg-black/40 blur-xl" />
            <CarArt bodyType="SUV" color="أبيض" className="relative w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
