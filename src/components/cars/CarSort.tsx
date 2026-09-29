"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "featured", label: "الأكثر تميزاً" },
  { value: "newest", label: "الأحدث موديلاً" },
  { value: "price-asc", label: "السعر: من الأقل للأعلى" },
  { value: "price-desc", label: "السعر: من الأعلى للأقل" },
  { value: "mileage-asc", label: "الأقل كيلومترات" },
];

export function CarSort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("sort") ?? "featured";

  function handleChange(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "featured") params.delete("sort");
    else params.set("sort", v);
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-950 outline-none focus:border-brand-400"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
