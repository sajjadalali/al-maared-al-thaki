import rawCars from "./cars.json";
import type { Car, CarFilters } from "@/types/car";

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
      `${car.brand} ${car.model} ${car.year} ${car.city} ${car.color} ${car.bodyType} ${car.description}`
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

/** Returns similar cars to the given car (same body type or brand), excluding itself. */
export function getSimilarCars(car: Car, limit = 4): Car[] {
  const sameBrandOrType = cars.filter(
    (c) => c.id !== car.id && (c.brand === car.brand || c.bodyType === car.bodyType)
  );
  return sameBrandOrType.slice(0, limit);
}

/** Distinct brand list, sorted alphabetically. */
export function getBrands(): string[] {
  return uniqueSorted(cars.map((car) => car.brand));
}

/** Distinct city list, in a stable order derived from the data. */
export function getCities(): string[] {
  return uniqueSorted(cars.map((car) => car.city));
}

/** Distinct body types available in the catalog. */
export function getBodyTypes(): string[] {
  return uniqueSorted(cars.map((car) => car.bodyType));
}

export function getMinMaxPrice(): { min: number; max: number } {
  const prices = cars.map((car) => car.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "ar"));
}

function normalize(text: string): string {
  return text.toString().trim().toLowerCase();
}
