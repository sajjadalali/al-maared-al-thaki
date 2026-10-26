import rawCars from "./cars.json";
import { brandLabel, getFilterOptions, type FacetCar, type FilterSelection } from "@/lib/filterOptions";
import {
  BODY_TYPE_ALIASES,
  BRAND_ALIASES,
  CHINESE_BRANDS,
  FUEL_ALIASES,
  MODEL_ALIASES,
  ORIGIN_ALIASES,
  normalizeArabic,
} from "@/lib/carAliases";
import { originLabel } from "@/lib/format";
import type { Car, CarFilters, CarSummary } from "@/types/car";

const cars: Car[] = rawCars as Car[];

/** Returns every car in the catalog. */
export function getAllCars(): Car[] {
  return cars;
}

/** Returns a single car by its id, or undefined if it doesn't exist. */
export function getCarById(id: string): Car | undefined {
  return cars.find((car) => car.id === id);
}

/** Returns featured cars, optionally limited to a maximum count. */
export function getFeaturedCars(limit?: number): Car[] {
  const featured = cars.filter((car) => car.featured);
  return typeof limit === "number" ? featured.slice(0, limit) : featured;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// How a buyer writes a name -> how the data writes it ("لاندكروزر" -> "land
// cruiser", "بيك اب" -> "شاحنه"). Longest first, so a phrase is rewritten before
// any shorter alias inside it.
const SEARCH_ALIASES = [
  ...BRAND_ALIASES.flatMap(({ brand, aliases }) => aliases.map((alias) => [alias, brand])),
  ...MODEL_ALIASES.flatMap(({ model, aliases }) => aliases.map((alias) => [alias, model])),
  ...ORIGIN_ALIASES.flatMap(({ origin, aliases }) => aliases.map((alias) => [alias, origin])),
  ...BODY_TYPE_ALIASES.flatMap(({ bodyType, aliases }) => aliases.map((alias) => [alias, bodyType])),
  ...FUEL_ALIASES.flatMap(({ fuel, aliases }) => aliases.map((alias) => [alias, fuel])),
  ["صينيه", "صيني"],
  ["صينيات", "صيني"],
]
  .map(([alias, name]) => [normalizeArabic(alias), normalizeArabic(name)])
  .filter(([alias, name]) => alias !== name)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([alias, name]) => [new RegExp(`(^|\\s)${escapeRegExp(alias)}(?=\\s|$)`, "gu"), `$1${name}`] as const);

// Words a search box query adds nothing with.
const STOP_WORDS = new Set(["سياره", "سيارات", "موديل"]);

function searchWords(text: string): string[] {
  return normalizeArabic(text)
    .split(/[^\p{L}\p{N}.]+/u)
    .filter(Boolean)
    // "الموصل" / "بالبصرة" are found as "موصل" / "بصره" too
    .map((word) => word.replace(/^(?:و|ب)?ال(?=\p{L}{2})/u, ""));
}

// What a car can be found by, built once. Names and listed attributes match
// from the start of a word, so a half-typed "كام" finds the Camry; the
// description and equipment list need the whole word, or "كام" would also
// find every car with a "كاميرا".
const searchIndex = new Map(
  cars.map((car) => {
    const model = car.model.toLowerCase();
    const names = [
      car.brand,
      brandLabel(car.brand),
      ...(BRAND_ALIASES.find((b) => b.brand === car.brand)?.aliases ?? []),
      car.model,
      ...MODEL_ALIASES.filter((m) => model.includes(m.model)).flatMap((m) => m.aliases),
      car.trim,
      car.year,
      car.city,
      car.color,
      car.bodyType,
      car.condition,
      car.origin && originLabel(car.origin),
      car.fuel,
      car.transmission,
      car.drivetrain,
      CHINESE_BRANDS.includes(car.brand) && "صيني",
      ...(car.tags ?? []),
    ];
    return [
      car.id,
      {
        prefix: [...new Set(searchWords(names.filter(Boolean).join(" ")))],
        exact: new Set(searchWords([car.description, ...car.features].join(" "))),
      },
    ];
  })
);

/**
 * Free-text search in Arabic or English. Every word of the query must match
 * the car ("كام 2024" finds a 2024 Camry), after Arabic spellings are mapped
 * to the catalog's names ("لاندكروزر خليجي", "تويوتا كامري هايبرد").
 */
export function searchCars(query: string): Car[] {
  let text = normalizeArabic(query);
  for (const [pattern, name] of SEARCH_ALIASES) text = text.replace(pattern, name);
  const terms = searchWords(text).filter((word) => !STOP_WORDS.has(word));
  if (terms.length === 0) return cars;

  return cars.filter((car) => {
    const { prefix, exact } = searchIndex.get(car.id)!;
    return terms.every((term) => exact.has(term) || prefix.some((word) => word.startsWith(term)));
  });
}

/** Filters cars by any combination of structured criteria. */
export function filterCars(filters: CarFilters): Car[] {
  let result = cars;

  if (filters.query) {
    result = searchCars(filters.query).filter((car) => result.includes(car));
  }
  if (filters.brand) {
    result = result.filter((car) => car.brand === filters.brand);
  }
  if (filters.bodyType) {
    result = result.filter((car) => car.bodyType === filters.bodyType);
  }
  if (filters.condition) {
    result = result.filter((car) => car.condition === filters.condition);
  }
  if (filters.origin) {
    result = result.filter((car) => car.origin === filters.origin);
  }
  if (filters.city) {
    result = result.filter((car) => car.city === filters.city);
  }
  if (filters.fuel) {
    result = result.filter((car) => car.fuel === filters.fuel);
  }
  if (filters.transmission) {
    result = result.filter((car) => car.transmission === filters.transmission);
  }
  if (filters.status) {
    result = result.filter((car) => car.status === filters.status);
  }
  if (typeof filters.featured === "boolean") {
    result = result.filter((car) => car.featured === filters.featured);
  }
  if (typeof filters.minPrice === "number") {
    result = result.filter((car) => car.price >= filters.minPrice!);
  }
  if (typeof filters.maxPrice === "number") {
    result = result.filter((car) => car.price <= filters.maxPrice!);
  }
  if (typeof filters.minYear === "number") {
    result = result.filter((car) => car.year >= filters.minYear!);
  }
  if (typeof filters.maxYear === "number") {
    result = result.filter((car) => car.year <= filters.maxYear!);
  }

  return result;
}

/**
 * Cars a buyer of `car` would also consider: same body type first, then same
 * brand, then closest in price. Sold cars are excluded.
 */
export function getSimilarCars(car: Car, limit = 4): Car[] {
  const score = (c: Car) => (c.bodyType === car.bodyType ? 2 : 0) + (c.brand === car.brand ? 1 : 0);
  return cars
    .filter((c) => c.id !== car.id && c.status !== "مباعة" && score(c) > 0)
    .sort(
      (a, b) =>
        score(b) - score(a) || Math.abs(a.price - car.price) - Math.abs(b.price - car.price)
    )
    .slice(0, limit);
}

/** Distinct city list, in a stable order derived from the data. */
export function getCities(): string[] {
  return uniqueSorted(cars.map((car) => car.city));
}

/** Live catalog numbers for marketing blocks, so they never overstate the stock. */
export function getCatalogStats(): { available: number; brands: number; cities: number } {
  const available = cars.filter((car) => car.status === "متوفرة");
  return {
    available: available.length,
    brands: new Set(available.map((car) => car.brand)).size,
    cities: new Set(available.map((car) => car.city)).size,
  };
}

/** Filter options over the stock; the free-text search runs here, next to the texts. */
export function getCatalogFilterOptions(selection: FilterSelection, query?: string) {
  const ids = query ? new Set(searchCars(query).map((car) => car.id)) : undefined;
  return getFilterOptions(cars, selection, ids && ((id) => ids.has(id)));
}

// Client components get these trimmed copies instead of importing the catalog,
// which would put every description and feature list in their bundle.

const FACET_KEYS = [
  "id", "brand", "city", "year", "price", "bodyType", "condition", "origin", "fuel", "transmission", "status", "tags",
] as const satisfies readonly (keyof FacetCar)[];

const SUMMARY_KEYS = [
  "id", "brand", "model", "trim", "year", "price", "condition", "origin", "bodyType",
  "mileage", "transmission", "fuel", "engine", "color", "city", "status", "images",
] as const satisfies readonly (keyof CarSummary)[];

function pick<K extends keyof Car>(car: Car, keys: readonly K[]): Pick<Car, K> {
  return Object.fromEntries(keys.map((key) => [key, car[key]])) as Pick<Car, K>;
}

export const toFacetCar = (car: Car): FacetCar => pick(car, FACET_KEYS);
export const toCarSummary = (car: Car): CarSummary => pick(car, SUMMARY_KEYS);

const arabicOrder = new Intl.Collator("ar").compare;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort(arabicOrder);
}
