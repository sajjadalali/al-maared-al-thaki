// Checks Sadeem's written reply against the facts the tools returned, so a
// made-up price or a hidden over-budget car never reaches the buyer.
import { USD_TO_IQD } from "@/lib/format";

export interface AllowedFigures {
  /** Dinar amounts the reply may quote: car prices, the budget, differences. */
  iqd: number[];
  /** Dollar amounts the reply may quote (the dinar ones are converted too). */
  usd: number[];
}

const toWestern = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
const num = (s: string) => Number(s.replace(/,/g, ""));

// Amounts written in words ("عشرين مليون", "خمسة وعشرين مليون") and Iraqi
// money slang ("3 دفاتر", "دفترين", "دفتر ونص", "50 ورقة") turned into digits.
const NUMBER_WORDS: [RegExp, number][] = (
  [
    ["واحد", 1], ["اثنين|ثنين", 2], ["ثلاث[ةه]?|تلات[ةه]?", 3], ["[اأ]ربع[ةه]?", 4], ["خمس[ةه]?", 5],
    ["ست[ةه]?", 6], ["سبع[ةه]?", 7], ["ثمان(?:ي[ةه])?|ثمن[ةه]?", 8], ["تسع[ةه]?", 9], ["عشر[ةه]?", 10],
    ["عشرين", 20], ["ثلاثين|تلاثين", 30], ["[اأ]ربعين", 40], ["خمسين", 50], ["ستين", 60],
    ["سبعين", 70], ["ثمانين", 80], ["تسعين", 90], ["مي[ةه]|مئ[ةه]", 100],
  ] as const
).map(([word, value]) => [new RegExp(`(^|[^\\u0600-\\u06FF])([وب]?)(?:${word})(?![\\u0600-\\u06FF])`, "g"), value]);

// "5 و20" → 25, "100 و50" → 150: units before tens, hundreds before the rest.
const joinable = (a: number, b: number) => (a < 10 && b % 10 === 0 && b < 100) || (a % 100 === 0 && a < 1000 && b < 100);

function spellOutNumbers(text: string): string {
  for (const [re, value] of NUMBER_WORDS) text = text.replace(re, `$1$2${value}`);
  return text
    .replace(/(\d+)\s*و\s*(\d+)/g, (m, a, b) => (joinable(Number(a), Number(b)) ? String(Number(a) + Number(b)) : m))
    .replace(/(\d+(?:\.\d+)?)?\s*(مليون|دفتر|دفاتر)\s*و\s*نص(?:ف)?/g, (_, n, unit) => `${Number(n ?? 1) + 0.5} ${unit}`)
    .replace(/دفترين/g, "20000 دولار")
    .replace(/(\d+(?:\.\d+)?)\s*(?:دفاتر|دفتر)/g, (_, n) => `${Math.round(Number(n) * 10_000)} دولار`)
    .replace(/(^|[^\d\s])\s*دفتر/g, "$1 10000 دولار")
    .replace(/(\d+)\s*(?:ورق[ةه]|ورقات)/g, (_, n) => `${Number(n) * 100} دولار`);
}

interface Figure {
  raw: string;
  value: number;
  currency: "IQD" | "USD";
  /** How far a figure may be from an allowed one, as it may be rounded. */
  tolerance: number;
}

/** Every money figure in a text: "36,000,000 د.ع", "36 مليون", "21,400 $", "20 ألف دولار". */
export function moneyFigures(input: string): Figure[] {
  let text = spellOutNumbers(toWestern(input));
  const found: Figure[] = [];
  const take = (re: RegExp, make: (m: RegExpMatchArray) => Figure | null) => {
    text = text.replace(re, (...m) => {
      const figure = make(m as unknown as RegExpMatchArray);
      if (figure) found.push(figure);
      return " ";
    });
  };

  // Dollars first, so their digits aren't read again as dinars.
  take(/(\d+(?:\.\d+)?)\s*(?:ألف|الف)\s*(?:دولار|\$)/g, (m) => ({
    raw: m[0], value: Number(m[1]) * 1000, currency: "USD", tolerance: 0.02,
  }));
  take(/\$\s*(\d{1,3}(?:,\d{3})+|\d+)|(\d{1,3}(?:,\d{3})+|\d+)\s*(?:\$|دولار)/g, (m) => {
    const value = num(m[1] ?? m[2]);
    return value >= 1000 ? { raw: m[0], value, currency: "USD", tolerance: 0.02 } : null;
  });
  take(/(\d+(?:\.\d+)?)\s*(?:مليون|ملايين)/g, (m) => ({
    raw: m[0], value: Number(m[1]) * 1_000_000, currency: "IQD", tolerance: 0.03,
  }));
  take(/\d{1,3}(?:,\d{3}){2,}/g, (m) => ({ raw: m[0], value: num(m[0]), currency: "IQD", tolerance: 0.001 }));
  return found;
}

/** The one amount in the buyer's budget words, in dinars, or null when there isn't exactly one. */
export function budgetFromWords(words: string): number | null {
  const figures = moneyFigures(words);
  if (figures.length !== 1) return null;
  const [f] = figures;
  return f.currency === "USD" ? Math.round(f.value * USD_TO_IQD) : f.value;
}

// Dollar figures are rounded to the nearest 100, so they get that much slack too.
const near = (value: number, allowed: number[], tolerance: number, floor: number) =>
  allowed.some((a) => Math.abs(value - a) <= Math.max(a * tolerance, floor));

/** Figures in `reply` that match nothing the tools (or the buyer) gave. */
export function unsupportedFigures(reply: string, allowed: AllowedFigures): string[] {
  const usd = [...allowed.usd, ...allowed.iqd.map((v) => v / USD_TO_IQD)];
  const iqd = [...allowed.iqd, ...allowed.usd.map((v) => v * USD_TO_IQD)];
  return moneyFigures(reply)
    .filter((f) => (f.currency === "USD" ? !near(f.value, usd, f.tolerance, 100) : !near(f.value, iqd, f.tolerance, 1)))
    .map((f) => f.raw.trim());
}

const OVER_BUDGET_WORDS = [
  "أغلى", "اغلى", "فوق ميزانيت", "أكثر من ميزانيت", "اكثر من ميزانيت", "أعلى من ميزانيت",
  "اعلى من ميزانيت", "خارج ميزانيت", "يتجاوز", "تتجاوز", "زيادة", "تزيد", "يزيد",
];

/** Whether a reply admits that some shown car costs more than the budget. */
export function mentionsOverBudget(reply: string): boolean {
  return OVER_BUDGET_WORDS.some((word) => reply.includes(word));
}
