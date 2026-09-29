import { filterCars, getAllCars, getCities } from "@/data/cars";
import { formatIQD } from "@/lib/format";
import type { Car, CarFilters, FuelType } from "@/types/car";
import type { AIService, ChatMessage } from "./types";

const BRAND_ALIASES: { brand: string; aliases: string[] }[] = [
  { brand: "Toyota", aliases: ["تويوتا", "toyota"] },
  { brand: "Kia", aliases: ["كيا", "kia"] },
  { brand: "Hyundai", aliases: ["هيونداي", "هونداي", "hyundai"] },
  { brand: "Nissan", aliases: ["نيسان", "nissan"] },
  { brand: "Chevrolet", aliases: ["شفروليه", "شيفروليه", "chevrolet"] },
  { brand: "Lexus", aliases: ["لكزس", "لكزص", "lexus"] },
  { brand: "Mercedes", aliases: ["مرسيدس", "مرسيديس", "بنز", "mercedes"] },
  { brand: "BMW", aliases: ["بي ام دبليو", "بي إم دبليو", "بمو", "bmw"] },
  { brand: "Ford", aliases: ["فورد", "ford"] },
  { brand: "Land Rover", aliases: ["لاند روفر", "رنج روفر", "land rover"] },
  { brand: "Honda", aliases: ["هوندا", "honda"] },
  { brand: "Mitsubishi", aliases: ["ميتسوبيشي", "mitsubishi"] },
];

const BODY_TYPE_ALIASES: { bodyType: string; aliases: string[] }[] = [
  { bodyType: "سيدان", aliases: ["سيدان", "sedan"] },
  { bodyType: "SUV", aliases: ["اس يو في", "إس يو في", "suv", "أسيوفي"] },
  { bodyType: "دفع رباعي", aliases: ["دفع رباعي", "جيب"] },
  { bodyType: "هاتشباك", aliases: ["هاتشباك", "hatchback"] },
  { bodyType: "شاحنة", aliases: ["شاحنة", "بيكب", "بك أب"] },
];

const FUEL_ALIASES: { fuel: FuelType; aliases: string[] }[] = [
  { fuel: "كهربائي", aliases: ["كهربائية", "كهربائي", "electric"] },
  { fuel: "هايبرد", aliases: ["هايبرد", "hybrid"] },
  { fuel: "ديزل", aliases: ["ديزل", "diesel"] },
  { fuel: "بنزين", aliases: ["بنزين", "بترول"] },
];

const GREETING_WORDS = ["مرحبا", "هلا", "السلام عليكم", "هاي", "سلام", "صباح الخير", "مساء الخير"];
const THANKS_WORDS = ["شكرا", "شكراً", "تسلم", "مشكور", "يعطيك العافية"];
const AGENT_WORDS = ["مندوب", "مبيعات", "اتصال", "تواصل مع", "رقم الهاتف"];
const CHEAPEST_WORDS = ["ارخص", "أرخص", "اقل سعر", "أقل سعر"];
const MOST_EXPENSIVE_WORDS = ["اغلى", "أغلى", "افخم", "أفخم"];

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(normalize(w)));
}

function extractBudget(text: string): number | undefined {
  const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*(مليون|م\b)/);
  if (millionMatch) return Math.round(parseFloat(millionMatch[1]) * 1_000_000);

  const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*(الف|ألف)/);
  if (thousandMatch) return Math.round(parseFloat(thousandMatch[1]) * 1_000);

  const rawNumber = text.match(/(\d{7,9})/);
  if (rawNumber) return Number(rawNumber[1]);

  return undefined;
}

function extractYear(text: string): number | undefined {
  const match = text.match(/(20[1-2][0-9])/);
  if (!match) return undefined;
  const year = Number(match[1]);
  return year >= 2015 && year <= 2027 ? year : undefined;
}

function extractBrand(text: string): string | undefined {
  const found = BRAND_ALIASES.find((entry) => includesAny(text, entry.aliases));
  return found?.brand;
}

function extractBodyType(text: string): string | undefined {
  const found = BODY_TYPE_ALIASES.find((entry) => includesAny(text, entry.aliases));
  return found?.bodyType;
}

function extractFuel(text: string): FuelType | undefined {
  const found = FUEL_ALIASES.find((entry) => includesAny(text, entry.aliases));
  return found?.fuel;
}

function extractCity(text: string): string | undefined {
  return getCities().find((city) => text.includes(normalize(city)));
}

function extractCondition(text: string): "جديدة" | "مستعملة" | undefined {
  if (includesAny(text, ["مستعمله", "مستعمل"])) return "مستعملة";
  if (includesAny(text, ["جديده", "جديد"])) return "جديدة";
  return undefined;
}

interface ParsedIntent {
  filters: CarFilters;
  isFamily: boolean;
  isLuxury: boolean;
  isEconomical: boolean;
  budget?: number;
}

function parseIntent(rawText: string): ParsedIntent {
  const text = normalize(rawText);

  const filters: CarFilters = {
    brand: extractBrand(text),
    bodyType: extractBodyType(text),
    city: extractCity(text),
    fuel: extractFuel(text),
    condition: extractCondition(text),
  };

  const year = extractYear(text);
  if (year) {
    filters.minYear = year;
    filters.maxYear = year;
  }

  const budget = extractBudget(text);
  if (budget) filters.maxPrice = budget;

  return {
    filters,
    isFamily: includesAny(text, ["عائليه", "عائلي", "عيلتي"]),
    isLuxury: includesAny(text, ["فخمه", "فاخره", "فخم", "فاخر"]),
    isEconomical: includesAny(text, ["اقتصاديه", "اقتصادي", "توفير"]),
    budget,
  };
}

function matchCars(intent: ParsedIntent): Car[] {
  let results = filterCars(intent.filters);

  if (intent.isLuxury) {
    results = results.filter((car) => car.tags?.includes("فاخرة"));
  }
  if (intent.isEconomical) {
    results = results.filter((car) => car.tags?.includes("اقتصادية") || car.price <= 35_000_000);
  }
  if (intent.isFamily) {
    results = results.filter((car) => car.seats >= 5);
  }

  return results;
}

function hasAnyFilter(intent: ParsedIntent): boolean {
  return (
    Boolean(intent.filters.brand) ||
    Boolean(intent.filters.bodyType) ||
    Boolean(intent.filters.city) ||
    Boolean(intent.filters.fuel) ||
    Boolean(intent.filters.condition) ||
    Boolean(intent.filters.minYear) ||
    Boolean(intent.budget) ||
    intent.isFamily ||
    intent.isLuxury ||
    intent.isEconomical
  );
}

function describeIntent(intent: ParsedIntent): string {
  const parts: string[] = [];
  if (intent.filters.brand) parts.push(intent.filters.brand);
  if (intent.filters.bodyType) parts.push(intent.filters.bodyType);
  if (intent.isLuxury) parts.push("فخمة");
  if (intent.isEconomical) parts.push("اقتصادية");
  if (intent.isFamily) parts.push("عائلية");
  if (intent.filters.condition) parts.push(intent.filters.condition);
  if (intent.filters.city) parts.push(`بـ${intent.filters.city}`);
  if (intent.budget) parts.push(`بميزانية ${formatIQD(intent.budget)}`);
  return parts.join(" - ");
}

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

function reply(content: string, cars?: Car[], quickReplies?: string[]): ChatMessage {
  return {
    id: makeId(),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    cars,
    quickReplies,
  };
}

const DEFAULT_QUICK_REPLIES = [
  "أريد سيارة اقتصادية",
  "أريد SUV عائلية",
  "أريد سيارة فخمة",
  "شنو أرخص سيارة عندكم؟",
];

const FOLLOW_UP_QUICK_REPLIES = [
  "عرض المزيد من هذا النوع",
  "شنو أرخص خيار بينهم؟",
  "تواصل مع مندوب المبيعات",
];

class MockAIService implements AIService {
  getWelcomeMessage(): ChatMessage {
    return reply(
      "هلا وغلا 👋 أني سديم، مساعدك الذكي بالمعرض الذكي. گلّي شنو نوع السيارة الي تدوّرها، أو ميزانيتك، وأني أدورلك على أفضل خيار من سياراتنا المتوفرة.",
      undefined,
      DEFAULT_QUICK_REPLIES
    );
  }

  async sendMessage(message: string): Promise<ChatMessage> {
    await wait(500 + Math.random() * 500);

    const text = normalize(message);

    if (includesAny(text, AGENT_WORDS)) {
      return reply(
        "أكيد! تكدر تتواصل مباشرة مع فريق المبيعات على الرقم +964 770 123 4567، أو أگدر أساعدك أنا هسه إذا گلّيلي شنو تحتاج بالضبط."
      );
    }

    if (includesAny(text, CHEAPEST_WORDS)) {
      const cheapest = [...getAllCars()].sort((a, b) => a.price - b.price).slice(0, 3);
      return reply(
        "زين، هذوله أرخص السيارات المتوفرة عدنا حالياً:",
        cheapest,
        FOLLOW_UP_QUICK_REPLIES
      );
    }

    if (includesAny(text, MOST_EXPENSIVE_WORDS)) {
      const priciest = [...getAllCars()].sort((a, b) => b.price - a.price).slice(0, 3);
      return reply(
        "هذوله أفخم وأغلى السيارات الموجودة بالمعرض حالياً:",
        priciest,
        FOLLOW_UP_QUICK_REPLIES
      );
    }

    if (includesAny(text, THANKS_WORDS) && text.length < 40) {
      return reply("العفو! تسعدني مساعدتك. إذا احتجت أي شي ثاني بخصوص السيارات، أني موجود 🚗");
    }

    if (includesAny(text, GREETING_WORDS) && text.length < 40) {
      return reply(
        "هلا بيك! تكدر تسألني عن ماركة معينة، ميزانية، نوع سيارة (سيدان، SUV، دفع رباعي...)، وأني أدورلك أفضل الخيارات المتوفرة.",
        undefined,
        DEFAULT_QUICK_REPLIES
      );
    }

    const intent = parseIntent(message);

    if (!hasAnyFilter(intent)) {
      return reply(
        "تكدر توضحلي أكثر؟ مثلاً گلّي الماركة، الميزانية التقريبية، أو نوع السيارة الي تحتاجها (سيدان، SUV، عائلية...) وراح أدورلك أفضل الخيارات المتوفرة بالمعرض.",
        undefined,
        DEFAULT_QUICK_REPLIES
      );
    }

    const matches = matchCars(intent);
    const description = describeIntent(intent);

    if (matches.length === 0) {
      const fallback = getAllCars()
        .filter((car) => car.featured)
        .slice(0, 3);
      return reply(
        `ما لگيت سيارة تطابق طلبك (${description}) بالضبط حالياً، بس هذوله من أفضل الخيارات المتوفرة عدنا وممكن تعجبك:`,
        fallback,
        FOLLOW_UP_QUICK_REPLIES
      );
    }

    const shown = matches.slice(0, 4);
    const intro =
      matches.length > shown.length
        ? `زين! لگيت ${matches.length} سيارة تناسب طلبك (${description})، هاي أبرزها:`
        : `تمام! هاي السيارات المتوفرة عدنا ضمن طلبك (${description}):`;

    return reply(intro, shown, FOLLOW_UP_QUICK_REPLIES);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockAIService = new MockAIService();
