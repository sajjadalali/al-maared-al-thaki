"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Heart, MapPin, Menu, Phone, Sparkles, X } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { openSadeemChat } from "@/lib/chatBus";
import { cn } from "@/lib/cn";
import { site, phoneHref, whatsappHref } from "@/config/site";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { Logo } from "@/components/layout/Logo";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/cars", label: "السيارات" },
  { href: "/cars?condition=جديدة", label: "الجديدة" },
  { href: "/cars?condition=مستعملة", label: "المستعملة" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
];

function useIsActive() {
  const pathname = usePathname();
  // Query-string links ("الجديدة") highlight via the listing page itself; here
  // only the path is compared so "السيارات" stays active across filters.
  return (href: string) => {
    const path = href.split("?")[0];
    if (href.includes("?")) return false;
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };
}

export function Header() {
  const isActive = useIsActive();
  const { favorites } = useFavorites();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden bg-brand-950 text-[12.5px] text-white/70 md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent-400" />
              {site.hours}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent-400" />
              {site.address}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href={phoneHref} className="flex items-center gap-1.5 transition hover:text-white">
              <Phone className="h-3.5 w-3.5" />
              <span dir="ltr">{site.phone}</span>
            </a>
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition hover:text-white"
            >
              <WhatsappIcon className="h-3.5 w-3.5" />
              واتساب
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-semibold transition",
                    active ? "text-brand-950" : "text-neutral-500 hover:text-brand-950"
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[17px] h-[3px] rounded-full bg-accent-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/favorites"
              aria-label="المفضلة"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-brand-900 transition hover:bg-surface"
            >
              <Heart className="h-5 w-5" />
              {favorites.length > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => openSadeemChat()}
              className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-200 px-4 py-2 text-sm font-bold text-brand-900 transition hover:border-brand-300 hover:bg-surface sm:flex"
            >
              <Sparkles className="h-4 w-4 text-accent-500" />
              اسأل سديم
            </button>

            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-brand-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 md:flex"
            >
              <WhatsappIcon className="h-4 w-4" />
              راسلنا
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="القائمة"
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-full text-brand-900 transition hover:bg-surface lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-black/5 bg-white px-4 pb-4 pt-2 lg:hidden">
            <nav className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-[15px] font-semibold",
                    isActive(link.href) ? "bg-surface text-brand-950" : "text-neutral-600 hover:bg-surface"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#1fa855] py-3 text-sm font-bold text-white"
              >
                <WhatsappIcon className="h-4 w-4" />
                واتساب
              </a>
              <a
                href={phoneHref}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-950 py-3 text-sm font-bold text-white"
              >
                <Phone className="h-4 w-4" />
                اتصال
              </a>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
              <Clock className="h-3.5 w-3.5" />
              {site.hours}
            </p>
          </div>
        )}
      </header>
    </>
  );
}
