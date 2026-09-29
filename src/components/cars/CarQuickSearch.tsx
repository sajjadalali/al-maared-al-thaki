"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, Coins, Calendar, Car as CarIcon } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { PRICE_BANDS, getFilterOptions } from "@/lib/filterOptions";

export function CarQuickSearch() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState("");
  const [priceIdx, setPriceIdx] = useState("");
  const options = getFilterOptions({ city, brand, year, price: priceIdx });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (brand) params.set("brand", brand);
    if (year) {
      params.set("minYear", year);
      params.set("maxYear", year);
    }
    if (priceIdx !== "") {
      const band = PRICE_BANDS[Number(priceIdx)];
      if (band.min !== undefined) params.set("minPrice", String(band.min));
      if (band.max !== undefined) params.set("maxPrice", String(band.max));
    }
    router.push(`/cars${params.toString() ? `?${params}` : ""}`);
  }

  const cell = "lg:border-s lg:border-black/5 lg:first:border-s-0";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-1 rounded-2xl border border-black/5 bg-white p-2 shadow-xl shadow-brand-950/10 sm:grid-cols-2 sm:gap-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-center lg:gap-0"
    >
      <Dropdown
        variant="hero"
        className={cell}
        icon={<MapPin className="h-3.5 w-3.5" />}
        label="الموقع"
        value={city}
        onChange={setCity}
        placeholder="جميع المحافظات"
        placeholderCount={options.totals.city}
        options={options.cities}
      />
      <Dropdown
        variant="hero"
        className={cell}
        icon={<CarIcon className="h-3.5 w-3.5" />}
        label="النوع"
        value={brand}
        onChange={setBrand}
        placeholder="جميع الماركات"
        placeholderCount={options.totals.brand}
        options={options.brands}
      />
      <Dropdown
        variant="hero"
        className={cell}
        icon={<Calendar className="h-3.5 w-3.5" />}
        label="الموديل"
        value={year}
        onChange={setYear}
        placeholder="كل السنوات"
        placeholderCount={options.totals.year}
        options={options.years}
      />
      <Dropdown
        variant="hero"
        className={cell}
        icon={<Coins className="h-3.5 w-3.5" />}
        label="السعر"
        value={priceIdx}
        onChange={setPriceIdx}
        placeholder="كل الأسعار"
        placeholderCount={options.totals.price}
        options={options.prices}
      />

      <button
        type="submit"
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-800 sm:col-span-2 lg:col-span-1 lg:ms-2 lg:mt-0"
      >
        <Search className="h-4 w-4" />
        ابحث الآن
      </button>
    </form>
  );
}
