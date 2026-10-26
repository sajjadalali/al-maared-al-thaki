// How Iraqi buyers write car names and attributes: Arabic spellings, joined or
// split words, Latin forms. Shared by the listing search, Sadeem and the
// Supabase sync, so all three understand the same words. The tables live in
// src/data/car-aliases.json (plain data the scripts can read too); aliases are
// written in normalized form.
import aliases from "@/data/car-aliases.json";
import type { CarOrigin, FuelType } from "@/types/car";

/**
 * The form every alias is compared in: lowercase, Western digits, no harakat or
 * tatweel, one alef, ه for ة and ي for ى. supabase normalize_ar() does the same.
 */
export function normalizeArabic(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

// Sold through Iraqi dealers ("وكالة"), so "صينية" means the make, not the origin.
export const CHINESE_BRANDS: string[] = aliases.chineseBrands;

export const BRAND_ALIASES: { brand: string; aliases: string[] }[] = aliases.brands;

// `model` is matched as a substring of the car's model name (lowercase).
export const MODEL_ALIASES: { model: string; aliases: string[] }[] = aliases.models;

// Import market as Iraqi buyers ask for it ("عندكم لاندكروزر خليجي؟").
export const ORIGIN_ALIASES = aliases.origins as { origin: CarOrigin; aliases: string[] }[];

export const BODY_TYPE_ALIASES: { bodyType: string; aliases: string[] }[] = aliases.bodyTypes;

export const FUEL_ALIASES = aliases.fuels as { fuel: FuelType; aliases: string[] }[];
