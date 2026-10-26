// How Iraqi buyers write car names and attributes: Arabic spellings, joined or
// split words, Latin forms. Shared by the listing search and Sadeem, so both
// understand the same words. Aliases are written in normalized form.
import type { CarOrigin, FuelType } from "@/types/car";

/**
 * The form every alias is compared in: lowercase, Western digits, no harakat or
 * tatweel, one alef, ه for ة and ي for ى.
 */
export function normalizeArabic(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

// Sold through Iraqi dealers ("وكالة"), so "صينية" means the make, not the origin.
export const CHINESE_BRANDS = ["Changan", "Geely", "Haval", "Chery", "MG", "BYD", "JAC", "Jetour"];

export const BRAND_ALIASES: { brand: string; aliases: string[] }[] = [
  { brand: "Toyota", aliases: ["تويوتا", "toyota"] },
  { brand: "Kia", aliases: ["كيا", "kia"] },
  { brand: "Hyundai", aliases: ["هيونداي", "هونداي", "hyundai"] },
  { brand: "Nissan", aliases: ["نيسان", "nissan"] },
  { brand: "Chevrolet", aliases: ["شفروليه", "شيفروليه", "شفرليت", "chevrolet"] },
  { brand: "Lexus", aliases: ["لكزس", "ليكزس", "لكزز", "lexus"] },
  { brand: "Mercedes", aliases: ["مرسيدس", "مرسيديس", "بنز", "mercedes"] },
  { brand: "BMW", aliases: ["بي ام دبليو", "بي ام", "بمو", "bmw"] },
  { brand: "Ford", aliases: ["فورد", "ford"] },
  { brand: "Land Rover", aliases: ["لاند روفر", "لاندروفر", "land rover"] },
  { brand: "Honda", aliases: ["هوندا", "honda"] },
  { brand: "Mitsubishi", aliases: ["ميتسوبيشي", "متسوبيشي", "mitsubishi"] },
  { brand: "Changan", aliases: ["شانجان", "جانجان", "شانكان", "changan"] },
  { brand: "Geely", aliases: ["جيلي", "geely"] },
  { brand: "Haval", aliases: ["هافال", "haval"] },
  { brand: "Chery", aliases: ["شيري", "chery"] },
];

// `model` is matched as a substring of the car's model name (lowercase).
export const MODEL_ALIASES: { model: string; aliases: string[] }[] = [
  { model: "camry", aliases: ["كامري", "camry"] },
  { model: "corolla", aliases: ["كورولا", "corolla"] },
  { model: "prado", aliases: ["برادو", "prado"] },
  { model: "land cruiser", aliases: ["لاندكروزر", "لاند كروزر", "land cruiser", "landcruiser"] },
  { model: "hilux", aliases: ["هايلكس", "هايلوكس", "هيلوكس", "hilux"] },
  { model: "k5", aliases: ["k5", "كي 5", "كي5"] },
  { model: "sportage", aliases: ["سبورتاج", "سبورتج", "سبورتيج", "sportage"] },
  { model: "sorento", aliases: ["سورينتو", "سورنتو", "sorento"] },
  { model: "picanto", aliases: ["بيكانتو", "picanto"] },
  { model: "ev6", aliases: ["ev6"] },
  { model: "sonata", aliases: ["سوناتا", "سوناته", "sonata"] },
  { model: "tucson", aliases: ["توسان", "tucson"] },
  { model: "elantra", aliases: ["النترا", "الانترا", "elantra"] },
  { model: "altima", aliases: ["التيما", "altima"] },
  { model: "patrol", aliases: ["باترول", "patrol"] },
  { model: "sunny", aliases: ["صني", "sunny"] },
  { model: "malibu", aliases: ["ماليبو", "malibu"] },
  { model: "tahoe", aliases: ["تاهو", "tahoe"] },
  { model: "es 350", aliases: ["es 350", "es350"] },
  { model: "rx 350", aliases: ["rx 350", "rx350"] },
  { model: "c 300", aliases: ["c 300", "c300", "سي كلاس", "c class", "c-class"] },
  { model: "gle", aliases: ["gle"] },
  { model: "520i", aliases: ["520i"] },
  { model: "x5", aliases: ["x5", "اكس 5", "اكس5"] },
  { model: "explorer", aliases: ["اكسبلورر", "اكسبلور", "explorer"] },
  { model: "defender", aliases: ["ديفندر", "defender"] },
  { model: "civic", aliases: ["سيفيك", "civic"] },
  { model: "pajero", aliases: ["باجيرو", "pajero"] },
  { model: "santa fe", aliases: ["سنتافي", "سانتافي", "سانتا في", "santa fe", "santafe"] },
  { model: "cs75", aliases: ["cs75", "سي اس 75", "cs 75"] },
  { model: "coolray", aliases: ["كولراي", "كول راي", "coolray"] },
  { model: "h6", aliases: ["h6", "اتش 6", "اج 6"] },
  { model: "tiggo", aliases: ["تيغو", "تيجو", "تيكو", "tiggo"] },
];

// Import market as Iraqi buyers ask for it ("عندكم لاندكروزر خليجي؟").
export const ORIGIN_ALIASES: { origin: CarOrigin; aliases: string[] }[] = [
  { origin: "خليجي", aliases: ["خليجي", "خليجيه", "خليجيات"] },
  { origin: "أمريكي", aliases: ["امريكي", "امريكيه", "امريكا", "امريكان"] },
  { origin: "كوري", aliases: ["كوري", "كوريه"] },
  { origin: "كندي", aliases: ["كندي", "كنديه"] },
  { origin: "أوروبي", aliases: ["اوروبي", "اوروبيه", "الماني", "المانيه"] },
  { origin: "وكالة", aliases: ["وكاله", "وكالات"] },
];

export const BODY_TYPE_ALIASES: { bodyType: string; aliases: string[] }[] = [
  { bodyType: "سيدان", aliases: ["سيدان", "sedan", "صالون"] },
  { bodyType: "SUV", aliases: ["اس يو في", "suv"] },
  { bodyType: "دفع رباعي", aliases: ["دفع رباعي", "4x4"] },
  { bodyType: "هاتشباك", aliases: ["هاتشباك", "hatchback"] },
  { bodyType: "شاحنة", aliases: ["شاحنه", "بيكب", "بكب", "بيك اب", "pickup"] },
];

export const FUEL_ALIASES: { fuel: FuelType; aliases: string[] }[] = [
  { fuel: "كهربائي", aliases: ["كهربائيه", "كهربائي", "كهرباء", "electric"] },
  { fuel: "هايبرد", aliases: ["هايبرد", "هايبريد", "hybrid"] },
  { fuel: "ديزل", aliases: ["ديزل", "diesel"] },
  { fuel: "بنزين", aliases: ["بنزين"] },
];
