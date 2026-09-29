"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, Coins, Calendar, Car as CarIcon } from "lucide-react";
import { PRICE_BANDS, YEAR_OPTIONS } from "@/lib/filterOptions";
import { getBodyTypes, getCities } from "@/data/cars";

export function CarQuickSearch() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [priceIdx, setPriceIdx] = useState("");
  const [year, setYear] = useState("");
  const [bodyType, setBodyType] = useState("");

  const cities = getCities();
  const bodyTypes = getBodyTypes();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (bodyType) params.set("bodyType", bodyType);
    if (year) {
      params.set("minYear", year);
      params.set("maxYear", year);
    }
    if (priceIdx !== "") {
      const band = PRICE_BANDS[Number(priceIdx)];
      if (band.min) params.set("minPrice", String(band.min));
      if (band.max) params.set("maxPrice", String(band.max));
    }
    router.push(`/cars${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-2 rounded-2xl border border-black/5 bg-white p-2.5 shadow-xl shadow-brand-950/10 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr]"
    >
      <button
        type="submit"
        className="order-last flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800 lg:order-first"
      >
        <Search className="h-4 w-4" />
        بحث
      </button>

      <SelectField
        icon={<MapPin className="h-4 w-4" />}
        label="الموقع"
        value={city}
        onChange={setCity}
        placeholder="جميع المحافظات"
        options={cities}
      />
      <SelectField
        icon={<Coins className="h-4 w-4" />}
        label="السعر"
        value={priceIdx}
        onChange={setPriceIdx}
        placeholder="اختر السعر"
        options={PRICE_BANDS.map((b, i) => ({ label: b.label, value: String(i) }))}
      />
      <SelectField
        icon={<Calendar className="h-4 w-4" />}
        label="الموديل"
        value={year}
        onChange={setYear}
        placeholder="اختر الموديل"
        options={YEAR_OPTIONS.map((y) => String(y))}
      />
      <SelectField
        icon={<CarIcon className="h-4 w-4" />}
        label="النوع"
        value={bodyType}
        onChange={setBodyType}
        placeholder="اختر النوع"
        options={bodyTypes}
      />
    </form>
  );
}

interface Option {
  label: string;
  value: string;
}

function SelectField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: (string | Option)[];
}) {
  const normalized: Option[] = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );

  return (
    <label className="flex flex-col gap-1 rounded-xl px-3 py-1.5 hover:bg-surface">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent text-sm font-semibold text-brand-950 outline-none"
      >
        <option value="">{placeholder}</option>
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
