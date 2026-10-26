"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { PRICE_BANDS, priceBandIndex, type FilterOptionSets } from "@/lib/filterOptions";

// URL keys that count as a user-chosen filter (sorting doesn't).
const FILTER_KEYS = [
  "query", "brand", "bodyType", "condition", "origin", "city", "fuel",
  "transmission", "minPrice", "maxPrice", "minYear", "tag",
];

// The listing page renders the sidebar on desktop and the button + bottom
// sheet on phones; both read and write the same URL. The page computes
// `options` on the server for the current URL, so they refresh with it.
export function CarFilters({
  options,
  resultCount,
  variant,
}: {
  options: FilterOptionSets;
  resultCount: number;
  variant: "sidebar" | "drawer";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const priceIdx = priceBandIndex(searchParams.get("minPrice"), searchParams.get("maxPrice"));

  // Every change goes through one URL update, so related keys (minYear +
  // maxYear, minPrice + maxPrice) never overwrite each other.
  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query !== (searchParams.get("query") ?? "")) setParams({ query: query || null });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const param = (key: string) => searchParams.get(key) ?? "";
  const activeCount = FILTER_KEYS.filter((k) => k !== "maxPrice" && searchParams.has(k)).length;

  function clearAll() {
    setQuery("");
    const sort = searchParams.get("sort");
    router.replace(sort ? `${pathname}?sort=${sort}` : pathname, { scroll: false });
  }

  const fields = (
    <>
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="car-search" className="mb-1.5 block text-xs font-bold text-neutral-500">
          بحث
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            id="car-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ماركة، موديل، مدينة..."
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pe-3.5 ps-9 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <Dropdown
        label="الماركة"
        value={param("brand")}
        onChange={(v) => setParams({ brand: v || null })}
        options={options.brands}
        placeholder="جميع الماركات"
        placeholderCount={options.totals.brand}
      />
      <Dropdown
        label="السعر"
        value={priceIdx}
        onChange={(v) => {
          const band = v === "" ? undefined : PRICE_BANDS[Number(v)];
          setParams({
            minPrice: band?.min !== undefined ? String(band.min) : null,
            maxPrice: band?.max !== undefined ? String(band.max) : null,
          });
        }}
        options={options.prices}
        placeholder="كل الأسعار"
        placeholderCount={options.totals.price}
      />
      <Dropdown
        label="الموديل (سنة الصنع)"
        value={param("minYear")}
        onChange={(v) => setParams({ minYear: v || null, maxYear: v || null })}
        options={options.years}
        placeholder="كل السنوات"
        placeholderCount={options.totals.year}
      />
      <Dropdown
        label="نوع الهيكل"
        value={param("bodyType")}
        onChange={(v) => setParams({ bodyType: v || null })}
        options={options.bodyTypes}
        placeholder="جميع الأنواع"
        placeholderCount={options.totals.bodyType}
      />
      <Dropdown
        label="الحالة"
        value={param("condition")}
        onChange={(v) => setParams({ condition: v || null })}
        options={options.conditions}
        placeholder="جديدة ومستعملة"
        placeholderCount={options.totals.condition}
      />
      <Dropdown
        label="الوارد"
        value={param("origin")}
        onChange={(v) => setParams({ origin: v || null })}
        options={options.origins}
        placeholder="الكل"
        placeholderCount={options.totals.origin}
      />
      <Dropdown
        label="المحافظة"
        value={param("city")}
        onChange={(v) => setParams({ city: v || null })}
        options={options.cities}
        placeholder="جميع المحافظات"
        placeholderCount={options.totals.city}
      />
      <Dropdown
        label="نوع الوقود"
        value={param("fuel")}
        onChange={(v) => setParams({ fuel: v || null })}
        options={options.fuels}
        placeholder="جميع الأنواع"
        placeholderCount={options.totals.fuel}
      />
      <Dropdown
        label="ناقل الحركة"
        value={param("transmission")}
        onChange={(v) => setParams({ transmission: v || null })}
        options={options.transmissions}
        placeholder="الكل"
        placeholderCount={options.totals.transmission}
      />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-surface sm:col-span-2 lg:col-span-1"
        >
          <X className="h-4 w-4" />
          مسح كل الفلاتر
        </button>
      )}
    </>
  );

  const badge = activeCount > 0 && (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-400 px-1.5 text-[11px] font-bold text-brand-950">
      {activeCount}
    </span>
  );

  if (variant === "sidebar") {
    return (
      <aside className="w-[280px] shrink-0">
        <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain rounded-3xl border border-black/[0.07] bg-white p-5">
          <h2 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-brand-950">
            <SlidersHorizontal className="h-4 w-4" />
            تصفية النتائج
            {badge}
          </h2>
          <div className="flex flex-col gap-4">{fields}</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex items-center justify-center gap-2 rounded-full bg-brand-950 px-5 py-2.5 text-sm font-bold text-white lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        الفلاتر
        {badge}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="تصفية النتائج">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl animate-fade-in">
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-neutral-200" />
            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <p className="flex items-center gap-2 text-base font-bold text-brand-950">
                تصفية النتائج
                {badge}
              </p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto overscroll-contain border-y border-black/5 px-5 py-4 sm:grid-cols-2">
              {fields}
            </div>
            <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-2xl bg-brand-950 py-3.5 text-[15px] font-bold text-white"
              >
                {resultCount === 0 ? "لا توجد نتائج" : `عرض ${resultCount} سيارة`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
