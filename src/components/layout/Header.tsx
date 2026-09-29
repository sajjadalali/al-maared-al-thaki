"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Heart, Menu, Phone, User, X } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/cars", label: "السيارات" },
  { href: "/favorites", label: "المفضلة" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
];

export function Header() {
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-white">
            <Car className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-extrabold text-brand-950">المعرض الذكي</span>
            <span className="text-[11px] font-medium text-neutral-500">سيارتك بثقة وسرعة</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "text-brand-900"
                    : "text-neutral-600 hover:bg-surface hover:text-brand-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="tel:+9647701234567"
            className="hidden items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-neutral-600 hover:bg-surface hover:text-brand-900 lg:flex"
          >
            <Phone className="h-4 w-4" />
            <span dir="ltr">+964 770 123 4567</span>
          </a>

          <Link
            href="/favorites"
            aria-label="المفضلة"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-surface hover:text-brand-900"
          >
            <Heart className="h-5 w-5" />
            {favorites.length > 0 && (
              <span className="absolute -top-0.5 -end-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {favorites.length}
              </span>
            )}
          </Link>

          <Link
            href="/login"
            aria-label="حسابي"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-surface hover:text-brand-900 sm:flex"
          >
            <User className="h-5 w-5" />
          </Link>

          <Link
            href="/login"
            className="hidden rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 sm:block"
          >
            تسجيل الدخول
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-900 hover:bg-surface md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-semibold",
                  pathname === link.href
                    ? "bg-surface text-brand-900"
                    : "text-neutral-600 hover:bg-surface"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-brand-900 px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              تسجيل الدخول
            </Link>
            <a
              href="tel:+9647701234567"
              className="mt-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-600"
            >
              <Phone className="h-4 w-4" />
              <span dir="ltr">+964 770 123 4567</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
