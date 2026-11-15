// What this visitor seems to want, kept in this browser only (localStorage):
// the car pages they opened and what Sadeem understood from their messages
// (budget, type, make, seats…). The home page's Sadeem section reads it to
// show scenes about their kind of car instead of random ones. Nothing here
// leaves the browser; old signals fade out after INTEREST_DAYS.

export const INTEREST_KEY = "autopro:interest";
const INTEREST_DAYS = 30;
const MAX_VIEWS = 20;

/** What Sadeem understood from one reply (the server sends it with the reply). */
export interface ChatInterest {
  budget?: number;
  bodyTypes?: string[];
  brands?: string[];
  models?: string[];
  seats?: number;
  fuels?: string[];
  condition?: string;
  /** The one car they said they want (buy, test drive, contact). */
  wanted?: string;
}

export interface Interest extends ChatInterest {
  /** Car pages opened, newest first. */
  views: { id: string; at: number }[];
  wantedAt?: number;
  updatedAt: number;
}

const empty = (): Interest => ({ views: [], updatedAt: 0 });

export function readInterest(): Interest {
  if (typeof window === "undefined") return empty();
  try {
    const stored = JSON.parse(window.localStorage.getItem(INTEREST_KEY) ?? "null") as Interest | null;
    if (!stored || typeof stored !== "object" || !Array.isArray(stored.views)) return empty();
    const since = Date.now() - INTEREST_DAYS * 86_400_000;
    if (stored.updatedAt < since) return empty();
    return {
      ...stored,
      views: stored.views.filter((v) => typeof v?.id === "string" && v.at >= since),
      wanted: stored.wantedAt && stored.wantedAt >= since ? stored.wanted : undefined,
    };
  } catch {
    return empty();
  }
}

function save(interest: Interest) {
  try {
    window.localStorage.setItem(INTEREST_KEY, JSON.stringify(interest));
  } catch {
    // Private mode or full storage: the section just stays general.
  }
}

/** A car page was opened. */
export function recordView(id: string) {
  const now = Date.now();
  const interest = readInterest();
  save({ ...interest, views: [{ id, at: now }, ...interest.views.filter((v) => v.id !== id)].slice(0, MAX_VIEWS), updatedAt: now });
}

/**
 * Sadeem answered: what he understood replaces the last understanding, field
 * by field (a new budget replaces the old one; a reply without one keeps it).
 */
export function recordChat(signal: ChatInterest | undefined) {
  if (!signal || Object.keys(signal).length === 0) return;
  const now = Date.now();
  const interest = readInterest();
  const next: Interest = { ...interest, updatedAt: now };
  for (const key of ["budget", "bodyTypes", "brands", "models", "seats", "fuels", "condition"] as const) {
    const value = signal[key];
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    (next as unknown as Record<string, unknown>)[key] = value;
  }
  if (signal.wanted) {
    next.wanted = signal.wanted;
    next.wantedAt = now;
  }
  save(next);
}

/** Whether there is anything to go on. */
export const knowsSomething = (i: Interest) =>
  i.views.length > 0 || !!i.wanted || !!i.budget || !!i.bodyTypes?.length || !!i.brands?.length || !!i.models?.length || !!i.seats || !!i.fuels?.length || !!i.condition;
