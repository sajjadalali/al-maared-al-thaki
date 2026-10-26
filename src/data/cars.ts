import rawCars from "./cars.json";
import { getFilterOptions, type FacetCar, type FilterSelection } from "@/lib/filterOptions";
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

/** Free-text search across brand, model, city, color and description. */
export function searchCars(query: string): Car[] {
  const normalized = normalize(query);
  if (!normalized) return cars;

  return cars.filter((car) => {
    const haystack = normalize(
      `${car.brand} ${car.model} ${car.trim ?? ""} ${car.year} ${car.city} ${car.color} ${car.bodyType} ${car.description}`
    );
    return haystack.includes(normalized);
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

function normalize(text: string): string {
  return text.toString().trim().toLowerCase();
}
