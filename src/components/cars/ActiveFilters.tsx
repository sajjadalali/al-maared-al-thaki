"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { PRICE_BANDS, brandLabel, priceBandIndex } from "@/lib/filterOptions";
import { originLabel } from "@/lib/format";

const LABELS: Record<string, (value: string) => string> = {
  query: (v) => `«${v}»`,
  brand: brandLabel,
  bodyType: (v) => (v === "شاحنة" ? "بيك أب" : v),
  condition: (v) => v,
  origin: originLabel,
  city: (v) => v,
  fuel: (v) => v,
  transmission: (v) => v,
  tag: (v) => v,
  minYear: (v) => `موديل ${v}`,
};

/** The chosen filters as removable chips above the results. */
export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: { key: string; label: string; remove: string[] }[] = [];
  for (const [key, format] of Object.entries(LABELS)) {
    const value = searchParams.get(key);
    if (value) chips.push({ key, label: format(value), remove: key === "minYear" ? ["minYear", "maxYear"] : [key] });
  }
  const band = priceBandIndex(searchParams.get("minPrice"), searchParams.get("maxPrice"));
  if (band) chips.push({ key: "price", label: PRICE_BANDS[Number(band)].label, remove: ["minPrice", "maxPrice"] });

  if (chips.length === 0) return null;

  function remove(keys: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of keys) params.delete(key);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => remove(chip.remove)}
          className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pe-2.5 ps-3.5 text-[13px] font-semibold text-brand-900 ring-1 ring-brand-100 transition hover:bg-brand-100"
        >
          {chip.label}
          <X className="h-3.5 w-3.5 text-brand-500" />
          <span className="sr-only">إزالة الفلتر</span>
        </button>
      ))}
    </div>
  );
}
