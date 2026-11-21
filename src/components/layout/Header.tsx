"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Clock, Heart, Menu, Phone, Sparkles, X } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { openSadeemChat } from "@/lib/chatBus";
import { cn } from "@/lib/cn";
import { site, phoneHref, whatsappHref } from "@/config/site";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { Logo } from "@/components/layout/Logo";
import { useBackCloses } from "@/lib/useBackCloses";

// «السيارات» opens a list of its own (19 Nov: new and used were two more
// links in the bar, next to it).
const CAR_LINKS = [
  { href: "/cars", label: "كل السيارات" },
  { href: "/cars?condition=جديدة", label: "السيارات الجديدة" },
  { href: "/cars?condition=مستعملة", label: "السيارات المستعملة" },
];

const NAV_LINKS: { href: string; label: string; children?: typeof CAR_LINKS }[] = [
  { href: "/", label: "الرئيسية" },
  { href: "/cars", label: "السيارات", children: CAR_LINKS },
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

/**
 * A bar link with a list under it: opens on hover, and on its arrow for touch
 * and the keyboard. The link itself still goes to its page.
 */
function NavMenu({
  link,
  active,
  linkClass,
}: {
  link: { href: string; label: string; children: typeof CAR_LINKS };
  active: boolean;
  linkClass: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // A short delay, so moving the mouse down to the list doesn't close it.
  const hide = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div
      ref={box}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className="flex items-center">
        <Link
          href={link.href}
          onClick={() => setOpen(false)}
          aria-current={active ? "page" : undefined}
          className={cn(linkClass, "pe-1")}
        >
          {link.label}
          {active && <span className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-accent-400" />}
        </Link>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : show())}
          aria-expanded={open}
          aria-label={`قائمة ${link.label}`}
          className="-ms-1 flex h-11 w-7 items-center justify-center rounded-lg opacity-70 transition hover:opacity-100"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>

      <div
        className={cn(
          "absolute start-0 top-full z-50 w-60 pt-1.5 transition duration-150",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
        )}
      >
        <ul className="rounded-2xl bg-white p-1.5 text-brand-950 shadow-[0_12px_32px_-8px_rgba(11,19,34,0.22)] ring-1 ring-brand-950/[0.07]">
          {link.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3.5 text-[15px] font-semibold text-neutral-700 transition hover:bg-surface hover:text-brand-950 focus-visible:bg-surface"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
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
  const [carsOpen, setCarsOpen] = useState(false);
  // The phone's back button closes the menu (21 Nov). Its links replace the
  // menu's history entry, so back from the page they open comes straight here.
  const { dismiss: closeMenu } = useBackCloses(open, () => setOpen(false), "siteMenu");
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
            const linkClass = cn(
              "relative flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-[15px] font-semibold transition",
              overlay
                ? active
                  ? "text-white"
                  : "text-white/75 hover:text-white"
                : active
                  ? "text-brand-950"
                  : "text-neutral-500 hover:text-brand-950"
            );
            if (link.children) {
              return (
                <div
                  key={link.href}
                  className={cn(
                    "rounded-lg",
                    overlay ? (active ? "text-white" : "text-white/75") : active ? "text-brand-950" : "text-neutral-500"
                  )}
                >
                  <NavMenu link={{ ...link, children: link.children }} active={active} linkClass={linkClass} />
                </div>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={linkClass}
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
            onClick={() => (open ? closeMenu() : setOpen(true))}
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
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.href}>
                  <button
                    type="button"
                    onClick={() => setCarsOpen((v) => !v)}
                    aria-expanded={carsOpen}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-[15px] font-semibold",
                      isActive(link.href) ? "bg-surface text-brand-950" : "text-neutral-600 hover:bg-surface"
                    )}
                  >
                    {link.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", carsOpen && "rotate-180")} />
                  </button>
                  {carsOpen && (
                    <div className="mb-1 ms-3 flex flex-col border-s-2 border-brand-950/[0.07] ps-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          replace
                          onClick={() => setOpen(false)}
                          className="rounded-xl px-3 py-2.5 text-[15px] font-semibold text-neutral-600 hover:bg-surface"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  replace
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-[15px] font-semibold",
                    isActive(link.href) ? "bg-surface text-brand-950" : "text-neutral-600 hover:bg-surface"
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
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
