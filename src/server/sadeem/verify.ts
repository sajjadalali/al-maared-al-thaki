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

interface Figure {
  raw: string;
  value: number;
  currency: "IQD" | "USD";
  /** How far a figure may be from an allowed one, as it may be rounded. */
  tolerance: number;
}

/** Every money figure in a text: "36,000,000 د.ع", "36 مليون", "21,400 $", "20 ألف دولار". */
export function moneyFigures(input: string): Figure[] {
  let text = toWestern(input);
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
