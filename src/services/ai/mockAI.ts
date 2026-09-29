import { filterCars, getAllCars, getCarById, getCities, getSimilarCars } from "@/data/cars";
import { formatIQD } from "@/lib/format";
import { site, phoneHref, whatsappHref } from "@/config/site";
import type { Car, CarFilters, FuelType } from "@/types/car";
import { MAX_CHAT_CARS, type AIService, type ChatAction, type ChatMessage } from "./types";

// Approximate market rate used when a visitor states a budget in dollars
// ("20 ألف" for a car in Iraq means $20,000).
const USD_TO_IQD = 1450;

const BRAND_ALIASES: { brand: string; aliases: string[] }[] = [
  { brand: "Toyota", aliases: ["تويوتا", "toyota"] },
  { brand: "Kia", aliases: ["كيا", "kia"] },
  { brand: "Hyundai", aliases: ["هيونداي", "هونداي", "hyundai"] },
  { brand: "Nissan", aliases: ["نيسان", "nissan"] },
  { brand: "Chevrolet", aliases: ["شفروليه", "شيفروليه", "شفرليت", "chevrolet"] },
  { brand: "Lexus", aliases: ["لكزس", "لكزز", "lexus"] },
  { brand: "Mercedes", aliases: ["مرسيدس", "مرسيديس", "بنز", "mercedes"] },
  { brand: "BMW", aliases: ["بي ام دبليو", "بي ام", "بمو", "bmw"] },
  { brand: "Ford", aliases: ["فورد", "ford"] },
  { brand: "Land Rover", aliases: ["لاند روفر", "لاندروفر", "land rover"] },
  { brand: "Honda", aliases: ["هوندا", "honda"] },
  { brand: "Mitsubishi", aliases: ["ميتسوبيشي", "متسوبيشي", "mitsubishi"] },
];

// `model` is matched as a substring of the car's model name (lowercase).
const MODEL_ALIASES: { model: string; aliases: string[] }[] = [
  { model: "camry", aliases: ["كامري", "camry"] },
  { model: "corolla", aliases: ["كورولا", "corolla"] },
  { model: "prado", aliases: ["برادو", "prado"] },
  { model: "land cruiser", aliases: ["لاندكروزر", "لاند كروزر", "land cruiser", "landcruiser"] },
  { model: "hilux", aliases: ["هايلكس", "هيلوكس", "hilux"] },
  { model: "k5", aliases: ["k5", "كي 5", "كي5"] },
  { model: "sportage", aliases: ["سبورتاج", "سبورتج", "sportage"] },
  { model: "sorento", aliases: ["سورينتو", "سورنتو", "sorento"] },
  { model: "picanto", aliases: ["بيكانتو", "picanto"] },
  { model: "ev6", aliases: ["ev6"] },
  { model: "sonata", aliases: ["سوناتا", "sonata"] },
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
];

const BODY_TYPE_ALIASES: { bodyType: string; aliases: string[] }[] = [
  { bodyType: "سيدان", aliases: ["سيدان", "sedan", "صالون"] },
  { bodyType: "SUV", aliases: ["اس يو في", "suv"] },
  { bodyType: "دفع رباعي", aliases: ["دفع رباعي", "4x4"] },
  { bodyType: "هاتشباك", aliases: ["هاتشباك", "hatchback"] },
  { bodyType: "شاحنة", aliases: ["شاحنه", "بيكب", "بكب", "بيك اب", "pickup"] },
];

const FUEL_ALIASES: { fuel: FuelType; aliases: string[] }[] = [
  { fuel: "كهربائي", aliases: ["كهربائيه", "كهربائي", "كهرباء", "electric"] },
  { fuel: "هايبرد", aliases: ["هايبرد", "هايبريد", "hybrid"] },
  { fuel: "ديزل", aliases: ["ديزل", "diesel"] },
  { fuel: "بنزين", aliases: ["بنزين"] },
];

const GREETING_WORDS = ["مرحبا", "هلا", "السلام عليكم", "سلام", "صباح الخير", "مساء الخير", "هلو"];
const THANKS_WORDS = ["شكرا", "تسلم", "مشكور", "يعطيك العافيه", "ممنون"];
const AGENT_WORDS = ["مندوب", "مبيعات", "اتصال", "اتصل", "رقم الهاتف", "رقمكم", "واتساب", "موظف"];
const TEST_DRIVE_WORDS = ["تجربه قياده", "اجربها", "اجرب السياره", "اختبار قياده"];
const MORE_WORDS = ["المزيد", "غيرها", "اكو غير", "خيارات ثانيه", "بعد خيارات", "غير هذني"];
const SIMILAR_WORDS = ["مشابهه", "مشابه", "شبيهه", "مثلها"];
const AMONG_WORDS = ["بينهم", "منهم", "بيناتهم"];
const CHEAPEST_WORDS = ["ارخص", "اقل سعر"];
const MOST_EXPENSIVE_WORDS = ["اغلى", "افخم"];

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word match, allowing common Arabic proclitics (و، ب، ال، بال...), so
// "بنز" does not match inside "بنزين" and "جيب" never appears inside "جيبلي".
function hasWord(text: string, word: string): boolean {
  const w = escapeRegExp(normalize(word));
  return new RegExp(`(^|[^\\p{L}\\p{N}])(?:و|ف|ب|ل|ال|بال|وال|لل)?${w}(?=$|[^\\p{L}\\p{N}])`, "u").test(text);
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
  const thousand = text.match(/(\d+(?:\.\d+)?)\s*(الف|الاف|k)/);
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

function extractBrand(text: string): string | undefined {
  const known = BRAND_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.brand;
  if (known) return known;
  // Brands added later through the Excel sheet are recognised by their name.
  return [...new Set(getAllCars().map((c) => c.brand))].find((b) => hasWord(text, b));
}

function extractModel(text: string): string | undefined {
  const known = MODEL_ALIASES.find((entry) => hasAnyWord(text, entry.aliases))?.model;
  if (known) return known;
  const models = [...new Set(getAllCars().map((c) => c.model.toLowerCase()))].sort(
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

function extractCity(text: string): string | undefined {
  return getCities().find((city) => text.includes(normalize(city)));
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
    model: extractModel(text),
    minSeats: extractMinSeats(text),
    isFamily: includesAny(text, ["عائليه", "عائلي", "عيلتي", "للعائله", "للعيله"]),
    isLuxury: includesAny(text, ["فخمه", "فاخره", "فخم", "فاخر"]),
    isEconomical: includesAny(text, ["اقتصاديه", "اقتصادي", "توفير", "رخيصه"]),
    budget,
  };
}

function matchCars(intent: ParsedIntent): Car[] {
  let results = filterCars(intent.filters);

  if (intent.model) {
    results = results.filter((car) => car.model.toLowerCase().includes(intent.model!));
  }
  if (intent.minSeats) {
    results = results.filter((car) => car.seats >= intent.minSeats!);
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
    f.brand || f.bodyType || f.city || f.fuel || f.condition || f.minYear || intent.model || intent.minSeats ||
      intent.budget || intent.isFamily || intent.isLuxury || intent.isEconomical
  );
}

function modelLabel(modelKey: string): string {
  return getAllCars().find((c) => c.model.toLowerCase().includes(modelKey))?.model ?? modelKey;
}

function formatBudget(value: number): string {
  if (value >= 1_000_000) {
    const millions = Math.round((value / 1_000_000) * 10) / 10;
    return `${millions} مليون`;
  }
  return formatIQD(value);
}

/** Short tags describing what was understood, e.g. ["Toyota Camry", "حتى 30 مليون"]. */
function describeIntent(intent: ParsedIntent): string[] {
  const parts: string[] = [];
  const name = [intent.filters.brand, intent.model && modelLabel(intent.model)].filter(Boolean).join(" ");
  if (name) parts.push(name);
  if (intent.filters.minYear) parts.push(`موديل ${intent.filters.minYear}`);
  if (intent.filters.bodyType) parts.push(intent.filters.bodyType);
  if (intent.minSeats) parts.push(`${intent.minSeats} مقاعد فأكثر`);
  if (intent.filters.fuel) parts.push(intent.filters.fuel);
  if (intent.isLuxury) parts.push("فخمة");
  if (intent.isEconomical) parts.push("اقتصادية");
  if (intent.isFamily) parts.push("عائلية");
  if (intent.filters.condition) parts.push(intent.filters.condition);
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

const DEFAULT_QUICK_REPLIES = [
  "أريد سيارة اقتصادية",
  "أريد SUV عائلية",
  "أريد سيارة فخمة",
  "شنو أرخص سيارة عندكم؟",
];

const SINGLE_CAR_QUICK_REPLIES = ["أريد حجز تجربة قيادة", "سيارات مشابهة", "تواصل مع مندوب المبيعات"];

function listQuickReplies(hasMore: boolean) {
  return [
    ...(hasMore ? ["عرض المزيد"] : []),
    "شنو أرخص خيار بينهم؟",
    "تواصل مع مندوب المبيعات",
  ];
}

// ---------- conversation context (from history) ----------

function lastShownCars(history: ChatMessage[]): Car[] {
  const msg = [...history].reverse().find((m) => m.role === "assistant" && m.cars?.length);
  return (msg?.cars ?? []).map((c) => getCarById(c.id)).filter((c): c is Car => Boolean(c));
}

function lastSearchIntent(history: ChatMessage[]): ParsedIntent | undefined {
  for (const m of [...history].reverse()) {
    if (m.role !== "user") continue;
    const intent = parseIntent(m.content);
    if (hasAnyFilter(intent)) return intent;
  }
  return undefined;
}

function shownCarIds(history: ChatMessage[]): Set<string> {
  return new Set(history.flatMap((m) => (m.role === "assistant" ? m.cars ?? [] : [])).map((c) => c.id));
}

// ---------- replies ----------

// The detailed car card carries the specs, so the text stays short.
function singleCarReply(car: Car, intro?: string): ChatMessage {
  const where = car.status === "متوفرة" ? `متوفرة عدنا ب${car.city}` : `حالياً ${car.status}`;
  return reply(
    intro ?? `**${carLabel(car)}** ${where} 👌\nهاي أهم تفاصيلها، وإذا عجبتك تكدر تحجز تجربة قيادة أو تراسلنا مباشرة.`,
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

class MockAIService implements AIService {
  getWelcomeMessage(): ChatMessage {
    return reply(
      `هلا وغلا 👋 أني **سديم**، مساعدك الذكي ب${site.name}.\nگلّي شنو السيارة الي تدوّرها أو ميزانيتك، وأني ألگيلك أفضل خيار من سياراتنا المتوفرة.`,
      { quickReplies: DEFAULT_QUICK_REPLIES }
    );
  }

  async sendMessage(message: string, history: ChatMessage[] = []): Promise<ChatMessage> {
    await wait(500 + Math.random() * 500);

    const text = normalize(message);
    const intent = parseIntent(message);
    const matches = hasAnyFilter(intent) ? matchCars(intent) : [];
    const focusCar = matches.length === 1 ? matches[0] : lastShownCars(history)[0];

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
      const similar = getSimilarCars(focusCar, MAX_CHAT_CARS);
      if (similar.length === 0) {
        return reply(`حالياً ما عندي سيارات قريبة من **${carLabel(focusCar)}**، بس تكدر تشوف كل السيارات بصفحة السيارات.`);
      }
      return listReply(`هذني سيارات قريبة من **${carLabel(focusCar)}**:`, similar);
    }

    const wantsCheapest = includesAny(text, CHEAPEST_WORDS);
    if (wantsCheapest || includesAny(text, MOST_EXPENSIVE_WORDS)) {
      const among = includesAny(text, AMONG_WORDS);
      const previous = among ? lastSearchIntent(history) : undefined;
      const pool = hasAnyFilter(intent)
        ? matches
        : previous
          ? matchCars(previous)
          : among
            ? lastShownCars(history)
            : getAllCars().filter((c) => c.status !== "مباعة");
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
        describeIntent(intent),
        MAX_CHAT_CARS
      );
    }

    if (includesAny(text, MORE_WORDS) && !hasAnyFilter(intent)) {
      const previous = lastSearchIntent(history);
      if (!previous) {
        return reply("گلّي شنو تدوّر بالضبط وأعرضلك الخيارات.", { quickReplies: DEFAULT_QUICK_REPLIES });
      }
      const seen = shownCarIds(history);
      const remaining = matchCars(previous).filter((c) => !seen.has(c.id));
      if (remaining.length === 0) {
        return reply("هذني كل السيارات المتوفرة ضمن طلبك. تحب أدورلك على شي ثاني؟", {
          criteria: describeIntent(previous),
          quickReplies: DEFAULT_QUICK_REPLIES,
        });
      }
      return listReply("تفضل، هذني خيارات ثانية ضمن نفس طلبك:", remaining, describeIntent(previous));
    }

    if (includesAny(text, THANKS_WORDS) && text.length < 40) {
      return reply("العفو! تسعدني مساعدتك 🚗\nإذا احتجت أي شي ثاني بخصوص السيارات، أني موجود.");
    }

    if (!hasAnyFilter(intent)) {
      return reply(hasAnyWord(text, GREETING_WORDS) ? `هلا بيك! 👋\n${HELP_TEXT}` : `ما فهمت طلبك بالضبط 🙏\n${HELP_TEXT}`, {
        quickReplies: DEFAULT_QUICK_REPLIES,
      });
    }

    const criteria = describeIntent(intent);

    if (matches.length === 0) {
      // Relax the request before giving up: same model/brand without the other
      // constraints, then the showroom's featured cars.
      const relaxed = intent.model
        ? matchCars({ ...intent, filters: {}, budget: undefined })
        : intent.filters.brand
          ? filterCars({ brand: intent.filters.brand })
          : [];
      if (relaxed.length > 0) {
        return listReply("ما عندي تطابق كامل لطلبك حالياً، بس هذني أقرب الخيارات:", relaxed, criteria);
      }
      const fallback = getAllCars().filter((car) => car.featured);
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
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockAIService = new MockAIService();
