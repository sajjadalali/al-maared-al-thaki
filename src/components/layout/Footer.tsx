import Link from "next/link";
import { Car, MapPin, Phone, Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/ui/SocialIcons";

const QUICK_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/cars", label: "السيارات" },
  { href: "/favorites", label: "المفضلة" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
];

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-brand-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <Car className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold">المعرض الذكي</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/60">
            منصة ذكية تربط بين المعارض والعملاء في العراق، تصفّح مئات السيارات الجديدة
            والمستعملة، وتحدث مع سديم مساعدك الذكي ليساعدك على اختيار السيارة الأنسب لك بسرعة
            وسهولة.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {[FacebookIcon, InstagramIcon, YoutubeIcon].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="تابعنا"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">روابط سريعة</h3>
          <ul className="mt-4 space-y-2.5">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-white/60 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">تواصل معنا</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span dir="ltr">+964 770 123 4567</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span dir="ltr">info@autopro.iq</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              بغداد، شارع فلسطين، العراق
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <p className="px-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} المعرض الذكي — جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}
