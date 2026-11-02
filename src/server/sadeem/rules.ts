import type { Catalog } from "@/data/cars";
import { USD_TO_IQD, formatIQD, originLabel } from "@/lib/format";
import { site, phoneHref, whatsappHref } from "@/config/site";
import {
  BODY_TYPE_ALIASES,
  BRAND_ALIASES,
  CHINESE_BRANDS,
  FUEL_ALIASES,
  MODEL_ALIASES,
  ORIGIN_ALIASES,
  normalizeArabic,
} from "@/lib/carAliases";
import type { Car, CarFilters, CarOrigin, FuelType } from "@/types/car";
import { MAX_CHAT_CARS, type ChatAction, type ChatMessage } from "@/services/ai/types";
import { DEFAULT_QUICK_REPLIES } from "@/services/ai/welcome";

const GREETING_WORDS = ["مرحبا", "هلا", "السلام عليكم", "سلام", "صباح الخير", "مساء الخير", "هلو"];
const THANKS_WORDS = ["شكرا", "تسلم", "مشكور", "يعطيك العافيه", "ممنون"];
const AGENT_WORDS = ["مندوب", "مبيعات", "اتصال", "اتصل", "رقم الهاتف", "رقمكم", "واتساب", "موظف"];
const TEST_DRIVE_WORDS = ["تجربه قياده", "اجربها", "اجرب السياره", "اختبار قياده"];
const MORE_WORDS = ["المزيد", "غيرها", "اكو غير", "خيارات ثانيه", "بعد خيارات", "غير هذني"];
const SIMILAR_WORDS = ["مشابهه", "مشابه", "شبيهه", "مثلها"];
const AMONG_WORDS = ["بينهم", "منهم", "بيناتهم"];
const CHEAPEST_WORDS = ["ارخص", "اقل سعر"];
const MOST_EXPENSIVE_WORDS = ["اغلى", "افخم"];

const normalize = normalizeArabic;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Each message checks the same few hundred alias words; compile each pattern once.
const wordPatterns = new Map<string, RegExp>();

// Whole-word match, allowing common Arabic proclitics (و، ب، ال، بال...), so
// "بنز" does not match inside "بنزين" and "جيب" never appears inside "جيبلي".
function hasWord(text: string, word: string): boolean {
  let pattern = wordPatterns.get(word);
  if (!pattern) {
    const w = escapeRegExp(normalize(word));
    pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(?:و|ف|ب|ل|ال|بال|وال|لل)?${w}(?=$|[^\\p{L}\\p{N}])`, "u");
    wordPatterns.set(word, pattern);
  }
  return pattern.test(text);
}

function hasAnyWord(text: string, words: string[]) {
  return words.some((w) => hasWord(text, w));
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(normalize(w)));
}

function extractBudget(text: string): number | undefined {
  const inDollars = /دولار|\$|usd/.test(text);
  const million = text.match(/(\d+(?:\.\d+)?)\s*(مليون|ملايين)/);
  if (million) return Math.round(parseFloat(million[1]) * 1_000_000 * (inDollars ? USD_TO_IQD : 1));

  // In the Iraqi car market "20 ألف" means twenty thousand dollars.
  const thousand = text.match(/(\d+(?:\.\d+)?)\s*(الف|الاف|k(?![\p{L}\p{N}]))/u);
  if (thousand) return Math.round(parseFloat(thousand[1]) * 1_000 * USD_TO_IQD);

  const raw = text.replace(/,/g, "").match(/\b(\d{7,10})\b/);
  if (raw) return Number(raw[1]);

  const dollars = text.replace(/,/g, "").match(/\$?\s*(\d{4,6})\s*(دولار|\$)/);
  if (dollars) return Number(dollars[1]) * USD_TO_IQD;

  return undefined;
}

function extractYear(text: string): number | undefined {
  const match = text.match(/\b(20[12]\d)\b/);
  if (!match) return undefined;
  const year = Number(match[1]);
  return year >= 2010 && year <= 2030 ? year : undefined;
}

const SEAT_WORDS: Record<string, number> = { سبع: 7, سبعه: 7, ثمان: 8, ثمانيه: 8, ثمن: 8 };

function extractMinSeats(text: string): number | undefined {
  const digits = text.match(/(\d)\s*(مقاعد|مقعد|ركاب|راكب|نفرات|نفر)/);
  if (digits) return Number(digits[1]);
  const word = text.match(/(سبعه|سبع|ثمانيه|ثمان|ثمن)\s*(مقاعد|ركاب|نفرات)/);
  return word ? SEAT_WORDS[word[1]] : undefined;
}

function extractBrand(catalog: Catalog, text: string): string | undefined {
  const known = BRAND_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.brand;
  if (known) return known;
  // Brands added later through the Excel sheet are recognised by their name.
  return [...new Set(catalog.getAllCars().map((c) => c.brand))].find((b) => hasWord(text, b));
}

function extractModel(catalog: Catalog, text: string): string | undefined {
  const known = MODEL_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.model;
  if (known) return known;
  const models = [...new Set(catalog.getAllCars().map((c) => c.model.toLowerCase()))].sort(
    (a, b) => b.length - a.length
  );
  return models.find((m) => hasWord(text, m));
}

function extractBodyType(text: string): string | undefined {
  return BODY_TYPE_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.bodyType;
}

function extractFuel(text: string): FuelType | undefined {
  return FUEL_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.fuel;
}

function extractOrigin(text: string): CarOrigin | undefined {
  return ORIGIN_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.origin;
}

function extractCity(catalog: Catalog, text: string): string | undefined {
  return catalog.getCities().find((city) => text.includes(normalize(city)));
}

function extractCondition(text: string): "جديدة" | "مستعملة" | undefined {
  if (includesAny(text, ["مستعمله", "مستعمل"])) return "مستعملة";
  if (includesAny(text, ["جديده", "جديد"]) || hasAnyWord(text, ["زيرو", "صفر"])) return "جديدة";
  return undefined;
}

interface ParsedIntent {
  filters: CarFilters;
  model?: string;
  minSeats?: number;
  isChinese: boolean;
  isFamily: boolean;
  isLuxury: boolean;
  isEconomical: boolean;
  budget?: number;
}

function parseIntent(catalog: Catalog, rawText: string): ParsedIntent {
  const text = normalize(rawText);

  const filters: CarFilters = {
    brand: extractBrand(catalog, text),
    bodyType: extractBodyType(text),
    city: extractCity(catalog, text),
    fuel: extractFuel(text),
    condition: extractCondition(text),
    origin: extractOrigin(text),
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
    model: extractModel(catalog, text),
    minSeats: extractMinSeats(text),
    isChinese: includesAny(text, ["صيني", "صينيه", "الصين"]),
    isFamily: includesAny(text, ["عائليه", "عائلي", "عيلتي", "للعائله", "للعيله"]),
    isLuxury: includesAny(text, ["فخمه", "فاخره", "فخم", "فاخر"]),
    isEconomical: includesAny(text, ["اقتصاديه", "اقتصادي", "توفير", "رخيصه"]),
    budget,
  };
}

function matchCars(catalog: Catalog, intent: ParsedIntent): Car[] {
  let results = catalog.filterCars(intent.filters);

  if (intent.model) {
    results = results.filter((car) => car.model.toLowerCase().includes(intent.model!));
  }
  if (intent.minSeats) {
    results = results.filter((car) => car.seats >= intent.minSeats!);
  }
  if (intent.isChinese) {
    results = results.filter((car) => CHINESE_BRANDS.includes(car.brand));
  }
  if (intent.isLuxury) {
    results = results.filter((car) => car.tags?.includes("فاخرة"));
  }
  if (intent.isEconomical) {
    results = results.filter((car) => car.tags?.includes("اقتصادية") || car.price <= 25_000_000);
  }
  if (intent.isFamily) {
    results = results.filter((car) => car.seats >= 5 && car.bodyType !== "هاتشباك");
  }

  results = results.filter((car) => car.status !== "مباعة");

  if (intent.isEconomical) return [...results].sort((a, b) => a.price - b.price);
  if (intent.budget) return [...results].sort((a, b) => b.price - a.price);
  return results;
}

function hasAnyFilter(intent: ParsedIntent): boolean {
  const f = intent.filters;
  return Boolean(
    f.brand || f.bodyType || f.city || f.fuel || f.condition || f.origin || f.minYear || intent.model ||
      intent.minSeats || intent.budget || intent.isChinese || intent.isFamily || intent.isLuxury || intent.isEconomical
  );
}

function modelLabel(catalog: Catalog, modelKey: string): string {
  return catalog.getAllCars().find((c) => c.model.toLowerCase().includes(modelKey))?.model ?? modelKey;
}

function formatBudget(value: number): string {
  if (value >= 1_000_000) {
    const millions = Math.round((value / 1_000_000) * 10) / 10;
    return `${millions} مليون`;
  }
  return formatIQD(value);
}

/** Short tags describing what was understood, e.g. ["Toyota Camry", "حتى 30 مليون"]. */
function describeIntent(catalog: Catalog, intent: ParsedIntent): string[] {
  const parts: string[] = [];
  const name = [intent.filters.brand, intent.model && modelLabel(catalog, intent.model)].filter(Boolean).join(" ");
  if (name) parts.push(name);
  if (intent.filters.minYear) parts.push(`موديل ${intent.filters.minYear}`);
  if (intent.filters.bodyType) parts.push(intent.filters.bodyType);
  if (intent.minSeats) parts.push(`${intent.minSeats} مقاعد فأكثر`);
  if (intent.filters.fuel) parts.push(intent.filters.fuel);
  if (intent.isLuxury) parts.push("فخمة");
  if (intent.isEconomical) parts.push("اقتصادية");
  if (intent.isFamily) parts.push("عائلية");
  if (intent.isChinese) parts.push("صينية");
  if (intent.filters.condition) parts.push(intent.filters.condition);
  if (intent.filters.origin) parts.push(originLabel(intent.filters.origin));
  if (intent.filters.city) parts.push(intent.filters.city);
  if (intent.budget) parts.push(`حتى ${formatBudget(intent.budget)}`);
  return parts;
}

const carLabel = (car: Car) => `${car.brand} ${car.model} ${car.year}`;

function countCars(n: number): string {
  if (n === 1) return "سيارة وحدة";
  if (n === 2) return "سيارتين";
  if (n <= 10) return `${n} سيارات`;
  return `${n} سيارة`;
}

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

interface ReplyExtras {
  cars?: Car[];
  criteria?: string[];
  quickReplies?: string[];
  actions?: ChatAction[];
}

function reply(content: string, extras: ReplyExtras = {}): ChatMessage {
  return {
    id: makeId(),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    ...extras,
    cars: extras.cars?.slice(0, MAX_CHAT_CARS),
    criteria: extras.criteria?.length ? extras.criteria : undefined,
  };
}

function contactActions(message: string): ChatAction[] {
  return [
    { kind: "whatsapp", label: "راسلنا واتساب", href: whatsappHref(message) },
    { kind: "phone", label: "اتصال", href: phoneHref },
  ];
}

const SINGLE_CAR_QUICK_REPLIES = ["أريد حجز تجربة قيادة", "سيارات مشابهة", "تواصل مع مندوب المبيعات"];

function listQuickReplies(hasMore: boolean) {
  return [
    ...(hasMore ? ["عرض المزيد"] : []),
    "شنو أرخص خيار بينهم؟",
    "تواصل مع مندوب المبيعات",
  ];
}

// ---------- conversation context (from history) ----------

/** Earlier messages as the chat route receives them: text plus the ids of the cars shown. */
export interface RulesHistory {
  role: "user" | "assistant";
  content: string;
  cars?: { id: string }[];
}

function lastShownCars(catalog: Catalog, history: RulesHistory[]): Car[] {
  const msg = [...history].reverse().find((m) => m.role === "assistant" && m.cars?.length);
  return (msg?.cars ?? []).map((c) => catalog.getCarById(c.id)).filter((c): c is Car => Boolean(c));
}

function lastSearchIntent(catalog: Catalog, history: RulesHistory[]): ParsedIntent | undefined {
  for (const m of [...history].reverse()) {
    if (m.role !== "user") continue;
    const intent = parseIntent(catalog, m.content);
    if (hasAnyFilter(intent)) return intent;
  }
  return undefined;
}

function shownCarIds(history: RulesHistory[]): Set<string> {
  return new Set(history.flatMap((m) => (m.role === "assistant" ? m.cars ?? [] : [])).map((c) => c.id));
}

// ---------- replies ----------

// The detailed car card carries the specs, so the text stays short.
function singleCarReply(car: Car, intro?: string): ChatMessage {
  const origin = car.origin ? ` ${originLabel(car.origin)}` : "";
  const where = car.status === "متوفرة" ? `متوفرة عدنا ب${car.city}` : `حالياً ${car.status}`;
  const highlights = car.features.slice(0, 3).join("، ");
  const features = highlights ? `\nمن مميزاتها: ${highlights}.` : "";
  return reply(
    (intro ?? `**${carLabel(car)}**${origin} ${where} 👌`) + features,
    {
      cars: [car],
      quickReplies: SINGLE_CAR_QUICK_REPLIES,
      actions: contactActions(`مرحباً، أنا مهتم بسيارة ${carLabel(car)} بسعر ${formatIQD(car.price)}`),
    }
  );
}

function listReply(intro: string, cars: Car[], criteria: string[] = [], total = cars.length): ChatMessage {
  const shown = cars.slice(0, MAX_CHAT_CARS);
  return reply(intro, {
    cars: shown,
    criteria,
    quickReplies: listQuickReplies(total > shown.length),
  });
}

const HELP_TEXT =
  "گلّي شنو تدوّر وأني أساعدك، مثلاً:\n- ماركة أو موديل (كامري، توسان...)\n- ميزانية (بحدود 30 مليون)\n- نوع السيارة (عائلية، SUV، اقتصادية)";

/**
 * Sadeem without the LLM: keyword rules over the catalog. The chat route uses
 * it when OpenRouter isn't configured or fails, so the chat never goes silent.
 */
export function rulesReply(catalog: Catalog, message: string, history: RulesHistory[] = []): ChatMessage {
  const text = normalize(message);
  const intent = parseIntent(catalog, message);
  const matches = hasAnyFilter(intent) ? matchCars(catalog, intent) : [];
  const focusCar = matches.length === 1 ? matches[0] : lastShownCars(catalog, history)[0];

  if (includesAny(text, TEST_DRIVE_WORDS)) {
    if (!focusCar) {
      return reply("أكيد! بس گلّي أي سيارة تريد تجربها حتى أرتبلك الموضوع.", {
        quickReplies: DEFAULT_QUICK_REPLIES,
      });
    }
    return reply(
      `حلو اختيارك! تجربة قيادة **${carLabel(focusCar)}** نرتبها ويه فريق المبيعات ب${focusCar.city}.\nدز رسالة على واتساب وحدد الوقت الي يناسبك، وهمه يأكدولك الموعد.`,
      { actions: contactActions(`مرحباً، أريد حجز تجربة قيادة لسيارة ${carLabel(focusCar)}`) }
    );
  }

  if (includesAny(text, AGENT_WORDS)) {
    const about = focusCar ? ` بخصوص **${carLabel(focusCar)}**` : "";
    return reply(
      `أكيد! تكدر تتواصل ويا فريق المبيعات مباشرة${about}.\n- الرقم: ${site.phone}\n- الدوام: ${site.hours}`,
      {
        actions: contactActions(
          focusCar ? `مرحباً، أستفسر عن سيارة ${carLabel(focusCar)}` : "مرحباً، عندي استفسار عن سيارة"
        ),
      }
    );
  }

  if (includesAny(text, SIMILAR_WORDS)) {
    if (!focusCar) {
      return reply("گلّي على أي سيارة تريد أشوفلك مثلها؟", { quickReplies: DEFAULT_QUICK_REPLIES });
    }
    const similar = catalog.getSimilarCars(focusCar, MAX_CHAT_CARS);
    if (similar.length === 0) {
      return reply(`حالياً ما عندي سيارات قريبة من **${carLabel(focusCar)}**، بس تكدر تشوف كل السيارات بصفحة السيارات.`);
    }
    return listReply(`هذني سيارات قريبة من **${carLabel(focusCar)}**:`, similar);
  }

  const wantsCheapest = includesAny(text, CHEAPEST_WORDS);
  if (wantsCheapest || includesAny(text, MOST_EXPENSIVE_WORDS)) {
    const among = includesAny(text, AMONG_WORDS);
    const previous = among ? lastSearchIntent(catalog, history) : undefined;
    const pool = hasAnyFilter(intent)
      ? matches
      : previous
        ? matchCars(catalog, previous)
        : among
          ? lastShownCars(catalog, history)
          : catalog.getAllCars().filter((c) => c.status !== "مباعة");
    const sorted = [...pool].sort((a, b) => (wantsCheapest ? a.price - b.price : b.price - a.price));

    if (sorted.length === 0) {
      return reply("ما لگيت سيارات ضمن هذا الطلب حالياً.", { quickReplies: DEFAULT_QUICK_REPLIES });
    }
    if (among) {
      return singleCarReply(
        sorted[0],
        `${wantsCheapest ? "أرخص" : "أغلى"} خيار بينهم هو **${carLabel(sorted[0])}** بسعر ${formatIQD(sorted[0].price)}:`
      );
    }
    return listReply(
      wantsCheapest ? "زين، هذني أرخص السيارات المتوفرة:" : "هذني أفخم السيارات المتوفرة عدنا:",
      sorted,
      describeIntent(catalog, intent),
      MAX_CHAT_CARS
    );
  }

  if (includesAny(text, MORE_WORDS) && !hasAnyFilter(intent)) {
    const previous = lastSearchIntent(catalog, history);
    if (!previous) {
      return reply("گلّي شنو تدوّر بالضبط وأعرضلك الخيارات.", { quickReplies: DEFAULT_QUICK_REPLIES });
    }
    const seen = shownCarIds(history);
    const remaining = matchCars(catalog, previous).filter((c) => !seen.has(c.id));
    if (remaining.length === 0) {
      return reply("هذني كل السيارات المتوفرة ضمن طلبك. تحب أدورلك على شي ثاني؟", {
        criteria: describeIntent(catalog, previous),
        quickReplies: DEFAULT_QUICK_REPLIES,
      });
    }
    return listReply("تفضل، هذني خيارات ثانية ضمن نفس طلبك:", remaining, describeIntent(catalog, previous));
  }

  if (includesAny(text, THANKS_WORDS) && text.length < 40) {
    return reply("العفو! تسعدني مساعدتك 🚗\nإذا احتجت أي شي ثاني بخصوص السيارات، أني موجود.");
  }

  if (!hasAnyFilter(intent)) {
    return reply(hasAnyWord(text, GREETING_WORDS) ? `هلا بيك! 👋\n${HELP_TEXT}` : `ما فهمت طلبك بالضبط 🙏\n${HELP_TEXT}`, {
      quickReplies: DEFAULT_QUICK_REPLIES,
    });
  }

  const criteria = describeIntent(catalog, intent);

  if (matches.length === 0) {
    // Relax the request before giving up: same model/brand without the other
    // constraints, then the showroom's featured cars.
    const relaxed = intent.model
      ? matchCars(catalog, { ...intent, filters: {}, budget: undefined })
      : intent.filters.brand
        ? catalog.filterCars({ brand: intent.filters.brand })
        : [];
    if (relaxed.length > 0) {
      return listReply("ما عندي تطابق كامل لطلبك حالياً، بس هذني أقرب الخيارات:", relaxed, criteria);
    }
    const fallback = catalog.getAllCars().filter((car) => car.featured);
    return listReply(
      "حالياً ما عندي سيارة بهذي المواصفات، بس هذني من أفضل سياراتنا:",
      fallback,
      criteria,
      MAX_CHAT_CARS
    );
  }

  if (matches.length === 1) return singleCarReply(matches[0]);

  const intro =
    matches.length > MAX_CHAT_CARS
      ? `لگيت ${countCars(matches.length)} تناسب طلبك، هاي أفضل ${MAX_CHAT_CARS}:`
      : `هاي ${countCars(matches.length)} متوفرة حسب طلبك:`;
  return listReply(intro, matches, criteria);
}
