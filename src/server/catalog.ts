// The showroom's stock, read from Supabase (cars_full) for every page, the
// chat and the sitemap, so the site and Sadeem never disagree about a car.
// Next.js keeps the result for a minute: an edit in Supabase shows up on the
// site within CATALOG_REVALIDATE seconds. cars.json is only the fallback for
// when Supabase isn't configured or doesn't answer.
import { cache } from "react";
import fallbackCars from "@/data/cars.json";
import { createCatalog, type Catalog } from "@/data/cars";
import { select, supabaseEnv } from "@/server/supabase";
import type { Car } from "@/types/car";

export const CATALOG_REVALIDATE = 60;
export const CATALOG_TAG = "catalog";

/** A row of the cars_full view. */
export interface CarRow {
  id: string;
  brand: string;
  model: string;
  trim_level: string | null;
  year: number;
  price_iqd: number;
  condition: string;
  origin: string | null;
  body_type: string;
  mileage_km: number;
  fuel: string;
  transmission: string;
  drivetrain: string | null;
  seats: number;
  horsepower: number | null;
  engine: string;
  color: string;
  city: string;
  status: string;
  tags: string[];
  features: string[];
  cylinders: number | null;
  featured: boolean;
  description: string;
  images: { path: string }[];
}

export function toCar(row: CarRow): Car {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    trim: row.trim_level ?? undefined,
    year: row.year,
    price: row.price_iqd,
    currency: "IQD",
    condition: row.condition as Car["condition"],
    origin: (row.origin ?? undefined) as Car["origin"],
    bodyType: row.body_type as Car["bodyType"],
    mileage: row.mileage_km,
    transmission: row.transmission as Car["transmission"],
    fuel: row.fuel as Car["fuel"],
    engine: row.engine,
    cylinders: row.cylinders ?? undefined,
    horsepower: row.horsepower ?? undefined,
    drivetrain: (row.drivetrain ?? undefined) as Car["drivetrain"],
    seats: row.seats,
    color: row.color,
    city: row.city,
    status: row.status as Car["status"],
    featured: row.featured,
    tags: row.tags,
    description: row.description,
    images: row.images.map((image) => image.path),
    features: row.features,
  };
}

async function loadCars(): Promise<Car[]> {
  const env = supabaseEnv();
  if (!env) return fallbackCars as Car[];
  try {
    const rows = await select<CarRow[]>(env, "cars_full", "select=*&order=id", {
      revalidate: CATALOG_REVALIDATE,
      tags: [CATALOG_TAG],
    });
    return rows.map(toCar);
  } catch (err) {
    console.error("[catalog] Supabase unavailable, showing cars.json:", err);
    return fallbackCars as Car[];
  }
}

/** The catalog for this request (loaded once per render, cached across requests). */
export const getCatalog: () => Promise<Catalog> = cache(async () => createCatalog(await loadCars()));
