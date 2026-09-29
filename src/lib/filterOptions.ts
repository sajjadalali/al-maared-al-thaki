import { getAllCars, searchCars } from "@/data/cars";
import type { Car } from "@/types/car";

export interface FilterOption {
  value: string;
  label: string;
  /** Secondary text, e.g. the brand's Latin name. */
  hint?: string;
  count: number;
}

// Bands are contiguous: min inclusive, max inclusive at one dinar below the next band.
export const PRICE_BANDS = [
  { label: "أقل من 20 مليون", min: undefined, max: 19_999_999 },
  { label: "20 - 35 مليون", min: 20_000_000, max: 34_999_999 },
  { label: "35 - 60 مليون", min: 35_000_000, max: 59_999_999 },
  { label: "60 - 100 مليون", min: 60_000_000, max: 99_999_999 },
  { label: "100 مليون فأكثر", min: 100_000_000, max: undefined },
] as const;

const BRAND_LABELS: Record<string, string> = {
  Toyota: "تويوتا",
  Kia: "كيا",
  Hyundai: "هيونداي",
  Nissan: "نيسان",
  Chevrolet: "شيفروليه",
  Lexus: "لكزس",
  Mercedes: "مرسيدس",
  BMW: "بي إم دبليو",
  Ford: "فورد",
  "Land Rover": "لاند روفر",
  Honda: "هوندا",
  Mitsubishi: "ميتسوبيشي",
  GMC: "جي إم سي",
  Genesis: "جينيسيس",
  Mazda: "مازدا",
  Volkswagen: "فولكس فاغن",
  Audi: "أودي",
  Porsche: "بورشه",
  Jeep: "جيب",
  Dodge: "دودج",
  Changan: "شانجان",
  Geely: "جيلي",
  Chery: "شيري",
  MG: "إم جي",
  Haval: "هافال",
};

export function brandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? brand;
}

const BODY_ORDER = ["سيدان", "SUV", "دفع رباعي", "هاتشباك", "شاحنة", "كوبيه"];
const FUEL_ORDER = ["بنزين", "هايبرد", "كهربائي", "ديزل"];
const TRANSMISSION_ORDER = ["أوتوماتيك", "يدوي"];
const CONDITION_ORDER = ["جديدة", "مستعملة"];

export type Facet =
  | "brand" | "city" | "year" | "price" | "bodyType" | "condition" | "fuel" | "transmission";

/** What the visitor has chosen so far; `price` is a PRICE_BANDS index. */
export type FilterSelection = Partial<Record<Facet | "query" | "tag", string>>;

const FACETS: Record<Facet, { key: (car: Car) => string; matches?: (car: Car, value: string) => boolean }> = {
  brand: { key: (c) => c.brand },
  city: { key: (c) => c.city },
  year: { key: (c) => String(c.year) },
  bodyType: { key: (c) => c.bodyType },
  condition: { key: (c) => c.condition },
  fuel: { key: (c) => c.fuel },
  transmission: { key: (c) => c.transmission },
  price: {
    key: () => "",
    matches: (c, value) => {
      const band = PRICE_BANDS[Number(value)];
      return !band || ((band.min === undefined || c.price >= band.min) && (band.max === undefined || c.price <= band.max));
    },
  },
};

function matchesFacet(car: Car, facet: Facet, value: string) {
  const def = FACETS[facet];
  return def.matches ? def.matches(car, value) : def.key(car) === value;
}

// Cars that satisfy every chosen filter except `except` — the classic faceted
// search rule, so each list shows what is still reachable from the others.
function narrowed(cars: Car[], selection: FilterSelection, except?: Facet): Car[] {
  const queryIds = selection.query ? new Set(searchCars(selection.query).map((c) => c.id)) : null;
  return cars.filter((car) => {
    if (queryIds && !queryIds.has(car.id)) return false;
    if (selection.tag && !car.tags?.includes(selection.tag)) return false;
    return (Object.keys(FACETS) as Facet[]).every((facet) => {
      const value = selection[facet];
      return facet === except || !value || matchesFacet(car, facet, value);
    });
  });
}

function countsFor(cars: Car[], facet: Facet) {
  const map = new Map<string, number>();
  for (const car of cars) {
    const key = FACETS[facet].key(car);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

// Known values keep a fixed, logical order; anything new added through the
// Excel sheet is appended after them.
function inOrder(values: string[], order: string[]): string[] {
  const known = order.filter((v) => values.includes(v));
  const extra = values.filter((v) => !order.includes(v)).sort((a, b) => a.localeCompare(b, "ar"));
  return [...known, ...extra];
}

export interface FilterOptionSets {
  brands: FilterOption[];
  bodyTypes: FilterOption[];
  conditions: FilterOption[];
  cities: FilterOption[];
  fuels: FilterOption[];
  transmissions: FilterOption[];
  years: FilterOption[];
  prices: FilterOption[];
  /** Cars reachable per facet when that facet is left open (for the "all" row). */
  totals: Record<Facet, number>;
}

/**
 * Options for every filter list. Values come from the stocked catalog (sold
 * cars excluded, values with no cars at all never listed); counts reflect the
 * visitor's other choices, and a 0 count marks an option that would lead to
 * an empty page.
 */
export function getFilterOptions(selection: FilterSelection = {}): FilterOptionSets {
  const stock = getAllCars().filter((car) => car.status !== "مباعة");
  const catalog = (facet: Facet) => [...new Set(stock.map(FACETS[facet].key))];
  const pool = (facet: Facet) => narrowed(stock, selection, facet);

  const build = (facet: Facet, values: string[], label: (v: string) => string = (v) => v): FilterOption[] => {
    const counts = countsFor(pool(facet), facet);
    return values.map((value) => ({ value, label: label(value), count: counts.get(value) ?? 0 }));
  };

  const brands = build("brand", catalog("brand"), brandLabel)
    .map((o) => ({ ...o, hint: o.label === o.value ? undefined : o.value }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));

  // Most-stocked governorates first — Baghdad usually leads.
  const cityStock = countsFor(stock, "city");
  const cities = build("city", catalog("city")).sort(
    (a, b) => cityStock.get(b.value)! - cityStock.get(a.value)! || a.label.localeCompare(b.label, "ar")
  );

  const years = build("year", catalog("year").sort((a, b) => Number(b) - Number(a)));

  const pricePool = pool("price");
  const prices = PRICE_BANDS.map((band, i) => ({
    value: String(i),
    label: band.label,
    count: pricePool.filter((c) => matchesFacet(c, "price", String(i))).length,
  })).filter((o) => stock.some((c) => matchesFacet(c, "price", o.value)));

  const totals = Object.fromEntries(
    (Object.keys(FACETS) as Facet[]).map((facet) => [facet, pool(facet).length])
  ) as Record<Facet, number>;

  return {
    brands,
    cities,
    years,
    prices,
    bodyTypes: build("bodyType", inOrder(catalog("bodyType"), BODY_ORDER)),
    conditions: build("condition", inOrder(catalog("condition"), CONDITION_ORDER)),
    fuels: build("fuel", inOrder(catalog("fuel"), FUEL_ORDER)),
    transmissions: build("transmission", inOrder(catalog("transmission"), TRANSMISSION_ORDER)),
    totals,
  };
}

export function priceBandIndex(minPrice: string | null, maxPrice: string | null): string {
  if (!minPrice && !maxPrice) return "";
  const idx = PRICE_BANDS.findIndex(
    (b) => String(b.min ?? "") === (minPrice ?? "") && String(b.max ?? "") === (maxPrice ?? "")
  );
  return idx === -1 ? "" : String(idx);
}

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
