"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { getBrands, getCities, getBodyTypes } from "@/data/cars";
import { PRICE_BANDS, YEAR_OPTIONS } from "@/lib/filterOptions";

const CONDITIONS = ["جديدة", "مستعملة"];
const FUELS = ["بنزين", "ديزل", "هايبرد", "كهربائي"];
const TRANSMISSIONS = ["أوتوماتيك", "يدوي"];

export function CarFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("query") ?? "");

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get("query") ?? "";
      if (query !== current) updateParam("query", query || null);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  function currentPriceIdx() {
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (!min && !max) return "";
    const idx = PRICE_BANDS.findIndex(
      (b) => String(b.min ?? "") === (min ?? "") && String(b.max ?? "") === (max ?? "")
    );
    return idx === -1 ? "" : String(idx);
  }

  function applyPriceBand(idx: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("minPrice");
    params.delete("maxPrice");
    if (idx !== "") {
      const band = PRICE_BANDS[Number(idx)];
      if (band.min) params.set("minPrice", String(band.min));
      if (band.max) params.set("maxPrice", String(band.max));
    }
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  const hasActiveFilters = [...searchParams.keys()].length > 0;

  const fields = (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-neutral-500">بحث</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن ماركة أو موديل..."
          className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <FilterSelect
        label="الماركة"
        value={searchParams.get("brand") ?? ""}
        onChange={(v) => updateParam("brand", v || null)}
        options={getBrands()}
        placeholder="جميع الماركات"
      />
      <FilterSelect
        label="نوع الهيكل"
        value={searchParams.get("bodyType") ?? ""}
        onChange={(v) => updateParam("bodyType", v || null)}
        options={getBodyTypes()}
        placeholder="جميع الأنواع"
      />
      <FilterSelect
        label="الحالة"
        value={searchParams.get("condition") ?? ""}
        onChange={(v) => updateParam("condition", v || null)}
        options={CONDITIONS}
        placeholder="الكل"
      />
      <FilterSelect
        label="المدينة"
        value={searchParams.get("city") ?? ""}
        onChange={(v) => updateParam("city", v || null)}
        options={getCities()}
        placeholder="جميع المحافظات"
      />
      <FilterSelect
        label="نوع الوقود"
        value={searchParams.get("fuel") ?? ""}
        onChange={(v) => updateParam("fuel", v || null)}
        options={FUELS}
        placeholder="الكل"
      />
      <FilterSelect
        label="ناقل الحركة"
        value={searchParams.get("transmission") ?? ""}
        onChange={(v) => updateParam("transmission", v || null)}
        options={TRANSMISSIONS}
        placeholder="الكل"
      />
      <FilterSelect
        label="نطاق السعر"
        value={currentPriceIdx()}
        onChange={applyPriceBand}
        options={PRICE_BANDS.map((b, i) => ({ label: b.label, value: String(i) }))}
        placeholder="كل الأسعار"
      />
      <FilterSelect
        label="سنة الصنع"
        value={searchParams.get("minYear") ?? ""}
        onChange={(v) => {
          updateParam("minYear", v || null);
          updateParam("maxYear", v || null);
        }}
        options={YEAR_OPTIONS.map(String)}
        placeholder="كل السنوات"
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            router.replace(pathname, { scroll: false });
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-surface"
        >
          <X className="h-4 w-4" />
          مسح كل الفلاتر
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-sm font-bold text-brand-900"
        >
          <SlidersHorizontal className="h-4 w-4" />
          الفلاتر {hasActiveFilters && "• مُفعّلة"}
        </button>
        {mobileOpen && (
          <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">{fields}</div>
        )}
      </div>

      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="sticky top-24 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-brand-950">
            <SlidersHorizontal className="h-4 w-4" />
            تصفية النتائج
          </h2>
          {fields}
        </div>
      </aside>
    </>
  );
}

interface Option {
  label: string;
  value: string;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | Option)[];
  placeholder: string;
}) {
  const normalized: Option[] = options.map((o) => (typeof o === "string" ? { label: o, value: o } : o));
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-neutral-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
      >
        <option value="">{placeholder}</option>
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
