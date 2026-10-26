import Link from "next/link";
import { cn } from "@/lib/cn";
import { site } from "@/config/site";

/** Brand mark: a car's front in an ink tile, with Sadeem's amber spark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <path
        d="M11 25.5v-4.2c0-.9.3-1.7.9-2.4l2.3-2.9 1.2-3.1c.4-1 1.3-1.6 2.3-1.6h6.6c1 0 1.9.6 2.3 1.6l1.2 3.1 2.3 2.9c.6.7.9 1.5.9 2.4v4.2"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 25.5h20v2.3c0 .8-.7 1.5-1.5 1.5h-17c-.8 0-1.5-.7-1.5-1.5z" fill="#fff" />
      <path d="M14.6 17.5h10.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="22" r="1.5" fill="#f6a723" />
      <circle cx="25" cy="22" r="1.5" fill="#f6a723" />
      <circle cx="31.5" cy="8.5" r="3" fill="#f6a723" />
    </svg>
  );
}

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2.5", className)}>
      <LogoMark className={cn("h-10 w-10", tone === "dark" ? "text-brand-950" : "text-white/10")} />
      <span className="flex flex-col leading-none">
        <span className={cn("text-[17px] font-bold", tone === "dark" ? "text-brand-950" : "text-white")}>
          {site.name}
        </span>
        <span className={cn("mt-1 text-[11.5px] font-normal", tone === "dark" ? "text-neutral-500" : "text-white/50")}>
          {site.tagline}
        </span>
      </span>
    </Link>
  );
}
