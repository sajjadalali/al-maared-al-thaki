"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Heart, Menu, Phone, Sparkles, X } from "lucide-react";
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

/** Past the first few pixels of the page. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

export function Header() {
  const isActive = useIsActive();
  const { favorites } = useFavorites();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  // On the homepage the header lies on the showroom photo until the page moves
  // (the hero slides under it); everywhere else, and once open, it is solid.
  const overlay = usePathname() === "/" && !scrolled && !open;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        overlay ? "bg-transparent text-white" : "border-b border-black/[0.06] bg-white/95 text-brand-950 backdrop-blur"
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[76px] lg:px-8">
        <Logo tone={overlay ? "light" : "dark"} tagline={false} />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-[15px] font-semibold transition",
                  overlay
                    ? active
                      ? "text-white"
                      : "text-white/75 hover:text-white"
                    : active
                      ? "text-brand-950"
                      : "text-neutral-500 hover:text-brand-950"
                )}
              >
                {link.label}
                {active && <span className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-accent-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/favorites"
            aria-label="المفضلة"
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-full transition",
              overlay ? "hover:bg-white/10" : "text-brand-900 hover:bg-surface"
            )}
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
            className={cn(
              "hidden min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition sm:flex",
              overlay
                ? "ring-1 ring-white/35 hover:bg-white/10"
                : "text-brand-900 ring-1 ring-brand-200 hover:bg-surface hover:ring-brand-300"
            )}
          >
            <Sparkles className={cn("h-4 w-4", overlay ? "text-accent-300" : "text-accent-500")} />
            اسأل سديم
          </button>

          <a
            href={whatsappHref()}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "hidden min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition md:flex",
              overlay ? "bg-white text-brand-950 hover:bg-white/90" : "bg-brand-950 text-white hover:bg-brand-800"
            )}
          >
            <WhatsappIcon className="h-4 w-4" />
            راسلنا
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
            aria-expanded={open}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full transition lg:hidden",
              overlay ? "hover:bg-white/10" : "text-brand-900 hover:bg-surface"
            )}
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
  );
}
