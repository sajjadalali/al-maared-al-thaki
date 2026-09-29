"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";

const SORT_OPTIONS = [
  { value: "featured", label: "الأكثر تميزاً", count: -1 },
  { value: "newest", label: "الأحدث موديلاً", count: -1 },
  { value: "price-asc", label: "السعر: من الأقل للأعلى", count: -1 },
  { value: "price-desc", label: "السعر: من الأعلى للأقل", count: -1 },
  { value: "mileage-asc", label: "الأقل كيلومترات", count: -1 },
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
    <Dropdown
      variant="compact"
      required
      label="ترتيب النتائج"
      icon={<ArrowUpDown className="h-4 w-4 shrink-0 text-neutral-400" />}
      value={value}
      onChange={handleChange}
      options={SORT_OPTIONS}
      placeholder="الأكثر تميزاً"
    />
  );
}
