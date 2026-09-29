import Link from "next/link";
import { CATEGORY_PILLS } from "@/lib/filterOptions";
import { cn } from "@/lib/cn";

function hrefFor(key: string) {
  if (key === "all") return "/cars";
  if (key === "كهربائية") return "/cars?fuel=كهربائي";
  if (key === "فاخرة") return "/cars?tag=فاخرة";
  return `/cars?bodyType=${encodeURIComponent(key)}`;
}

export function CategoryPills({ active }: { active?: string }) {
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
      {CATEGORY_PILLS.map((pill) => {
        const isActive = active === pill.key || (!active && pill.key === "all");
        return (
          <Link
            key={pill.key}
            href={hrefFor(pill.key)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              isActive
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-black/5 bg-white text-neutral-600 hover:border-brand-200 hover:text-brand-900"
            )}
          >
            {pill.label}
          </Link>
        );
      })}
    </div>
  );
}
