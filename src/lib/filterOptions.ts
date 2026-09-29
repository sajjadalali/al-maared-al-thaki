export const PRICE_BANDS = [
  { label: "أقل من 30 مليون", min: undefined, max: 30_000_000 },
  { label: "30 - 60 مليون", min: 30_000_000, max: 60_000_000 },
  { label: "60 - 100 مليون", min: 60_000_000, max: 100_000_000 },
  { label: "أكثر من 100 مليون", min: 100_000_000, max: undefined },
] as const;

export const YEAR_OPTIONS = [2024, 2023, 2022, 2021, 2020] as const;

export interface CategoryPill {
  label: string;
  /** matches Car.bodyType, or a special key handled by the caller */
  key: string;
}

export const CATEGORY_PILLS: CategoryPill[] = [
  { key: "all", label: "جميع السيارات" },
  { key: "فاخرة", label: "فاخرة" },
  { key: "SUV", label: "SUV" },
  { key: "سيدان", label: "سيدان" },
  { key: "هاتشباك", label: "هاتشباك" },
  { key: "دفع رباعي", label: "دفع رباعي" },
  { key: "شاحنة", label: "شاحنات" },
  { key: "كهربائية", label: "كهربائية" },
];
