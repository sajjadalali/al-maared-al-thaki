import Link from "next/link";
import { Clock, MapPin, Phone, Mail } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/ui/SocialIcons";
import { Logo } from "@/components/layout/Logo";
import { site, phoneHref, whatsappHref } from "@/config/site";

const BROWSE_LINKS = [
  { href: "/cars", label: "كل السيارات" },
  { href: "/cars?condition=جديدة", label: "السيارات الجديدة" },
  { href: "/cars?condition=مستعملة", label: "السيارات المستعملة" },
  { href: "/cars?bodyType=SUV", label: "SUV" },
  { href: "/cars?bodyType=دفع رباعي", label: "دفع رباعي" },
  { href: "/cars?tag=فاخرة", label: "سيارات فاخرة" },
];

const SHOWROOM_LINKS = [
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
  { href: "/favorites", label: "سياراتي المفضلة" },
];

const SOCIAL = [
  { href: whatsappHref(), label: "واتساب", Icon: WhatsappIcon },
  { href: site.social.facebook, label: "فيسبوك", Icon: FacebookIcon },
  { href: site.social.instagram, label: "إنستغرام", Icon: InstagramIcon },
  { href: site.social.youtube, label: "يوتيوب", Icon: YoutubeIcon },
].filter((s) => s.href);

function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/55 transition hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-brand-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:px-8">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">
            معرض سيارات جديدة ومستعملة في العراق، بأسعار معلنة وفحص قبل البيع، ومساعد ذكي اسمه سديم
            يساعدك على اختيار السيارة الأنسب.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            {SOCIAL.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-white/10 transition hover:bg-white/15"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <LinkColumn title="تصفّح" links={BROWSE_LINKS} />
        <LinkColumn title="المعرض" links={SHOWROOM_LINKS} />

        <div>
          <h3 className="text-sm font-bold text-white">تواصل معنا</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/55">
            <li>
              <a href={phoneHref} className="flex items-center gap-2.5 transition hover:text-white">
                <Phone className="h-4 w-4 shrink-0 text-accent-300" />
                <span dir="ltr">{site.phone}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 transition hover:text-white">
                <Mail className="h-4 w-4 shrink-0 text-accent-300" />
                <span dir="ltr">{site.email}</span>
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-accent-300" />
              {site.address}
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-accent-300" />
              {site.hours}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/40 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {site.name} — جميع الحقوق محفوظة
          </p>
          <p>الأسعار بالدينار العراقي وقد تتغير حسب السوق.</p>
        </div>
      </div>
    </footer>
  );
}
