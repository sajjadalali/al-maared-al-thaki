"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { PRICE_BANDS, getFilterOptions, priceBandIndex } from "@/lib/filterOptions";
import { cn } from "@/lib/cn";

// URL keys that count as a user-chosen filter (sorting doesn't).
const FILTER_KEYS = [
  "query", "brand", "bodyType", "condition", "city", "fuel",
  "transmission", "minPrice", "maxPrice", "minYear", "tag",
];

export function CarFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const priceIdx = priceBandIndex(searchParams.get("minPrice"), searchParams.get("maxPrice"));
  const options = getFilterOptions({
    query: searchParams.get("query") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    year: searchParams.get("minYear") ?? undefined,
    price: priceIdx || undefined,
    bodyType: searchParams.get("bodyType") ?? undefined,
    condition: searchParams.get("condition") ?? undefined,
    fuel: searchParams.get("fuel") ?? undefined,
    transmission: searchParams.get("transmission") ?? undefined,
  });

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

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-brand-900"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            تصفية النتائج
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-900 px-1.5 text-[11px] text-white">
                {activeCount}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", mobileOpen && "rotate-180")} />
        </button>
        {mobileOpen && (
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:grid-cols-2">
            {fields}
          </div>
        )}
      </div>

      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-brand-950">
            <SlidersHorizontal className="h-4 w-4" />
            تصفية النتائج
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-900 px-1.5 text-[11px] text-white">
                {activeCount}
              </span>
            )}
          </h2>
          <div className="flex flex-col gap-4">{fields}</div>
        </div>
      </aside>
    </>
  );
}
