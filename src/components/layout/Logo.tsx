import Link from "next/link";
import { cn } from "@/lib/cn";
import { site } from "@/config/site";
import { SadeemMark } from "@/components/ui/SadeemMark";

/*
 * The site's logo (20 Nov 2026): Sadeem's mark, the name in Ruqaa inside a chat
 * bubble, beside the showroom's name. It replaced the old car-front tile.
 * `tone` follows what is under it: "dark" for ink on the white header,
 * "light" for white on the homepage photo and in the footer. The mark takes
 * its colours from `tone`, not from the text around it.
 */
export function Logo({
  tone = "dark",
  tagline = true,
  className,
}: {
  tone?: "dark" | "light";
  /** The header shows the name only; the footer keeps the tagline. */
  tagline?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center gap-3", className)}>
      <SadeemMark tone={tone === "dark" ? "ink" : "light"} line={1.6} className="w-[60px] transition-colors duration-300" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn("text-[17px] font-bold transition-colors duration-300", tone === "dark" ? "text-brand-950" : "text-white")}>
          {site.name}
        </span>
        {/* A long tagline wraps to two lines on phones instead of pushing the menu off the screen. */}
        {tagline && (
          <span
            className={cn(
              "mt-1 max-w-[14rem] text-[11px] font-normal leading-[1.4] sm:max-w-none sm:text-[11.5px] sm:leading-none",
              tone === "dark" ? "text-neutral-500" : "text-white/65"
            )}
          >
            {site.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
