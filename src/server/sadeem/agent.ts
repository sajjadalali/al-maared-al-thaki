// One Sadeem reply: the LLM (via OpenRouter) reads the conversation, calls the
// catalog tools as often as it needs, then answers. Returns the text plus the
// cars it chose to show, loaded fresh from the database.
import { phoneHref, site, whatsappHref } from "@/config/site";
import type { SupabaseEnv } from "@/server/supabase";
import { carMarker } from "@/services/ai/carMarkers";
import type { ChatAction } from "@/services/ai/types";
import type { Car } from "@/types/car";
import { overviewAvailable, overviewPrices, systemPrompt } from "./prompt";
import { readCompletionStream } from "./stream";
import { toCar, type CarRow } from "@/server/catalog";
import {
  MAX_SHOWN_CARS,
  TOOL_DEFINITIONS,
  arabicNames,
  fetchCars,
  markShown,
  runTool,
  usdOf,
  type ArabicName,
  type TurnState,
} from "./tools";
import { mentionsOverBudget, moneyFigures, unsupportedFigures, type AllowedFigures } from "./verify";

// Fast and cheap with reliable tool calls; set OPENROUTER_MODEL for something else.
export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";
const MAX_ROUNDS = 6;

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  /** Cars shown with an assistant reply, so "الثانية" can be resolved. */
  cars?: { id: string; name: string }[];
  matchCount?: number;
}

/** What the buyer sees while the reply is being made. */
export type SadeemEvent =
  /** What Sadeem is doing, while no text is written yet ("يدوّر بالسيارات…"). */
  | { type: "status"; text: string }
  /** The reply so far (the whole text each time, already cleaned). */
  | { type: "text"; text: string };

export interface AgentReply {
  content: string;
  cars: Car[];
  quickReplies: string[];
  leadSaved: boolean;
  matchCount?: number;
  /** WhatsApp and call buttons, when the reply gives the contact details. */
  actions?: ChatAction[];
  searches: Record<string, unknown>[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** A text block that marks the end of a prefix providers may cache. */
interface CachedText {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral"; ttl?: "1h" };
}

interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null | CachedText[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  /** Thinking models (Claude, …) need their reasoning sent back with tool results. */
  reasoning_details?: unknown;
}

export interface OpenRouterEnv {
  apiKey: string;
  model: string;
  /** Tried by OpenRouter when `model` fails or is rate-limited. */
  fallbackModel?: string;
  /** How OpenRouter picks among a model's providers ("latency", "throughput", "price"). */
  providerSort?: string;
  baseUrl: string;
}

interface Completion extends Omit<LlmMessage, "content"> {
  content: string | null;
  /** The model that actually answered (differs when OpenRouter fell back). */
  model?: string;
}

export function openRouterEnv(): OpenRouterEnv | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  // Free models allow only a few requests a day; fall back to the paid default.
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || (model.endsWith(":free") ? DEFAULT_MODEL : undefined);
  return {
    apiKey,
    model,
    fallbackModel: fallbackModel && fallbackModel !== model ? fallbackModel : undefined,
    // A reply is a few short calls in a row, so the provider that starts
    // answering soonest matters more than raw tokens per second.
    providerSort: process.env.OPENROUTER_PROVIDER_SORT ?? "latency",
    // Any OpenAI-compatible endpoint works; OpenRouter by default.
    baseUrl: (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  };
}

/** What one reply cost in time and tokens, logged with the chat for tuning. */
interface TurnStats {
  /** Keeps calls on one provider, so its prompt cache stays warm. */
  sessionKey: string;
  /** One entry per model call: time, tokens, and what it did (tools called, whether it wrote text). */
  calls: { ms: number; model?: string; prompt?: number; cached?: number; tools: string[]; text: number }[];
}

// With onText the call is streamed and every piece of text is passed on as it
// arrives; the result is the same either way.
async function complete(
  env: OpenRouterEnv,
  messages: LlmMessage[],
  allowTools: boolean,
  turn: TurnStats,
  onText?: (delta: string) => void
): Promise<Completion> {
  const started = Date.now();
  const res = await fetch(`${env.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": site.url,
      "X-Title": "Al Maared Al Thaki",
    },
    body: JSON.stringify({
      ...(env.fallbackModel ? { models: [env.model, env.fallbackModel] } : { model: env.model }),
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: allowTools ? "auto" : "none",
      temperature: 0.2,
      // Room for the thinking of reasoning models on top of a short reply.
      max_tokens: 2000,
      // Short sales replies don't need long thinking; low effort keeps them fast.
      reasoning: { effort: process.env.OPENROUTER_REASONING_EFFORT || "low" },
      session_id: turn.sessionKey,
      ...(env.providerSort ? { provider: { sort: env.providerSort } } : {}),
      ...(onText ? { stream: true } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = onText ? await readCompletionStream(res, onText) : await res.json();
  const message = onText ? data.message : data.choices?.[0]?.message;
  if (!message) throw new Error(`OpenRouter: no message (${JSON.stringify(data).slice(0, 200)})`);
  turn.calls.push({
    ms: Date.now() - started,
    model: data.model,
    prompt: data.usage?.prompt_tokens,
    cached: data.usage?.prompt_tokens_details?.cached_tokens,
    tools: (message.tool_calls ?? []).map((call: { function: { name: string } }) => call.function.name),
    text: (message.content ?? "").length,
  });
  return {
    role: "assistant",
    content: message.content ?? null,
    tool_calls: message.tool_calls,
    reasoning_details: message.reasoning_details,
    model: data.model,
  };
}

// Earlier replies carry a note of what they were based on (from the database),
// so follow-ups can rely on facts the model no longer has tool results for.
// The browser names the cars "Ford Explorer 2022 – 37,000,000 د.ع"; the note
// gives the Arabic name instead, so follow-ups don't go back to English names.
function noteName(id: string, name: string, arabic: Map<string, ArabicName>): string {
  const [label, ...rest] = name.split(" – ");
  const year = label.match(/\d{4}$/)?.[0];
  const ar = arabic.get(id)?.full;
  return [ar && year ? `${ar} ${year}` : label, ...rest].join(" – ");
}

function historyToMessages(history: HistoryMessage[], arabic: Map<string, ArabicName>): LlmMessage[] {
  return history.map((m) => {
    if (m.role !== "assistant" || !m.cars?.length) return { role: m.role, content: m.content };
    const count = m.matchCount ? ` | عدد السيارات المطابقة للبحث: ${m.matchCount}` : "";
    const cars = m.cars.map((c) => `${c.id} ${noteName(c.id, c.name, arabic)}`).join("؛ ");
    return { role: m.role, content: `${m.content}\n\n[من قاعدة البيانات، السيارات المعروضة: ${cars}${count}]` };
  });
}

// Tools whose round may carry the main answer text (a reply written next to
// save_lead, with only a short line after its result).
const ANSWER_TOOLS = new Set(["save_lead"]);

const PREVIEW_MS = 80;

// What the buyer is told while tools run and nothing is written yet.
function statusOf(tools: string[]): string | undefined {
  if (tools.includes("search_cars")) return "سديم يدوّر بالسيارات…";
  if (tools.includes("get_car_details")) return "سديم يجيب التفاصيل…";
  if (tools.includes("save_lead")) return "سديم يسجّل رقمك…";
  return undefined;
}

// The reply ends with the buyer's next messages, written after the answer so
// they follow from it: "اقتراحات: قارنلي بيناتهم | أريد أرخص | …".
const SUGGESTIONS = /^\s*اقتراحات\s*[:：]/;

// A tap sends the option as it is: none the buyer would have to finish
// ("هذا رقمي:"), and none in Sadeem's voice ("شنو ميزانيتك؟").
const usableSuggestion = (o: string) =>
  o.length >= 3 &&
  o.length <= 60 &&
  !/[:：…]$|\.\.\.$/.test(o) &&
  !/\b07\b|xxx/i.test(o) &&
  // a phone number in a suggestion is one the model made up
  !/\d{7,}/.test(o.replace(/[\s-]/g, "")) &&
  !/ميزانيتك|^تحب |^تريد /.test(o);

function splitSuggestions(reply: string): { text: string; suggestions: string[] } {
  const lines = reply.split("\n");
  const at = lines.findLastIndex((line) => SUGGESTIONS.test(line));
  if (at < 0) return { text: reply, suggestions: [] };
  const suggestions = lines[at]
    .replace(SUGGESTIONS, "")
    .split("|")
    .map((o) => o.replace(/^[\s«"']+|[\s»"']+$/g, ""))
    .filter(usableSuggestion)
    .slice(0, 3);
  return { text: lines.filter((_, i) => i !== at).join("\n").trim(), suggestions };
}

// While it streams: no suggestions line, not even its first letters.
function hideSuggestions(text: string): string {
  const lines = text.split("\n").filter((line) => !SUGGESTIONS.test(line));
  const last = lines.at(-1)?.trim() ?? "";
  if (last && "اقتراحات:".startsWith(last)) lines.pop();
  return lines.join("\n").trimEnd();
}

// Arabic letters and their marks, not Arabic punctuation (، ؛ ؟) or digits:
// a word right before a comma still ends there.
const AR_LETTER = "\\u0620-\\u065F\\u066E-\\u06D3\\u06FA-\\u06FF";

// Gulf, Levantine, Egyptian and formal (فصحى) words models slip into, with
// their Iraqi equivalents. Applied in order, so "ولكن" goes before "لكن".
const IRAQI_WORDS = (
  [
    ["تبي|تبغى|تبغي|بدك", "تريد"], ["يبي|يبغى|يبغي|بده", "يريد"], ["الحين|دلوقتي", "هسه"], ["للحين", "لهسه"],
    ["وايد", "هواية"], ["كويس|منيح", "زين"], ["تكدر", "تگدر"], ["يكدر", "يگدر"],
    ["أقدر|اقدر", "أگدر"], ["تقدر", "تگدر"], ["يقدر", "يگدر"], ["نقدر", "نگدر"],
    ["أيوه|ايوه|أيوا|ايوا", "إي"], ["حالياً|حاليا|الآن|الان", "هسه"], ["سوف", "راح"],
    ["لماذا", "ليش"], ["ماذا", "شنو"], ["كيف", "شلون"], ["جداً|جدا", "كلش"], ["فقط", "بس"],
    ["ولكن", "بس"], ["لكن", "بس"], ["لا يوجد|لا توجد|ليس لدينا|ليس عندنا", "ماكو"], ["يوجد|توجد", "أكو"],
    ["لدينا", "عدنا"], ["لديك", "عندك"], ["عبر", "على"],
    ["معك", "وياك"], ["معكم", "وياكم"], ["معه", "وياه"], ["معها", "وياها"], ["معهم", "وياهم"], ["معنا", "ويانا"],
    ["في بغداد", "ببغداد"], ["أكدر|اكدر", "أگدر"], ["نكدر", "نگدر"], ["لكيت", "لگيت"], ["لكينا", "لگينا"],
    ["تقول", "تگول"], ["يقول", "يگول"], ["أقول|اقول", "أگول"], ["فيه", "بيه"], ["فيها", "بيها"], ["فيهم", "بيهم"],
    ["عذراً|عذرا|اعتذر|أعتذر|ألعذر|العذر", "آسف"], ["عدنا أكو|أكو عدنا|عندنا أكو|أكو عندنا", "عدنا"],
    ["أيه|ايه|أيوة|ايوة", "إي"],
  ] as const
).map(([words, iraqi]) => [new RegExp(`(^|[^${AR_LETTER}])([وف]?)(?:${words})(?![${AR_LETTER}])`, "g"), `$1$2${iraqi}`] as const);

// Persian kaf and yeh the model sometimes writes («کامری»); گ and چ are Iraqi and stay.
// Money in words, as the site writes it: دينار and دولار, not «د.ع» and «$».
const toIraqi = (text: string) =>
  IRAQI_WORDS.reduce((out, [re, iraqi]) => out.replace(re, iraqi), text)
    .replace(/ک/g, "ك")
    .replace(/ی/g, "ي")
    .replace(/د\.ع\.?/g, "دينار")
    .replace(/\s*\$/g, " دولار");

// Drops notes the model sometimes adds for itself: English ones ("the reply
// above is in the chat…"; every line meant for the buyer has Arabic in it) and
// copies of the database notes that history carries.
// Bold is for car names (they carry their year) and comparison labels
// ("**السعر:**"); anything else in bold («**بغداد**», «**9**») goes plain.
const boldCarsOnly = (text: string) =>
  text.replace(/\*\*([^*\n]+)\*\*(\s*:)?/g, (all, inner: string, colon?: string) =>
    /(19|20)\d\d/.test(inner) || /[:：]\s*$/.test(inner) || colon ? all : inner
  );

const cleanReply = (text: string) =>
  boldCarsOnly(toIraqi(text))
    // "بـ" glued to a word once its bold is gone: «بـبغداد» → «ببغداد».
    .replace(/بـ(?=[\u0621-\u064A])/g, "ب")
    .replace(/\[من قاعدة البيانات[^\]]*\]/g, "")
    .split("\n")
    .filter((line) => /[\u0600-\u06FF]/.test(line) || line.includes("**") || !/([A-Za-z]+\W+){3}/.test(line))
    .join("\n")
    .trim();

// A whole reply lists cars in bold or runs a few lines; a closing line doesn't.
const isFullReply = (text: string) => text.includes("**") || text.length >= 150;

// The model may write the answer next to save_lead and then only a closing
// line, or write the whole answer twice (once per round): keep one full answer.
function joinReply(answerTexts: string[], finalText: string): string {
  if (isFullReply(finalText)) return finalText;
  const full = answerTexts.filter(isFullReply).at(-1);
  const parts = [...(full ? [full] : answerTexts), finalText].filter(Boolean);
  // The same short answer written twice (once per round, worded a little
  // differently) is kept once: the later version.
  return parts.filter((part, i) => !parts.slice(i + 1).some((later) => sameText(part, later))).join("\n\n");
}

const words = (text: string) => new Set(text.split(/[^\p{L}\p{N}]+/u).filter(Boolean));

// Mostly the same words (Jaccard over 0.6): one answer written twice.
function sameText(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / (wa.size + wb.size - shared || 1) > 0.6;
}

type FoundCar = TurnState["found"] extends Map<string, infer C> ? C : never;

// A line that names the car: its year and its name in any form ("شيري تيغو",
// just "التيغو", or the Latin model).
function namesCar(line: string, car: FoundCar): boolean {
  const lower = line.toLowerCase();
  const names = [car.model, car.name?.full, car.name?.model].filter((n): n is string => Boolean(n));
  return lower.includes(String(car.year)) && names.some((n) => lower.includes(n.toLowerCase()));
}

/** Cars the tools returned that the reply names, in reply order. */
function mentionedCars(reply: string, found: TurnState["found"]): string[] {
  const lines = reply.split("\n");
  return [...found]
    .map(([id, car]) => ({ id, at: lines.findIndex((line) => namesCar(line, car)) }))
    .filter((car) => car.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((car) => car.id);
}

// Each car's card right under its paragraph: the block that starts with the
// car's bold name when there is one (so a car first named in passing in the
// opening line doesn't get its card above its own block), otherwise the first
// paragraph whose first line names it. Cards for cars without one stay under
// the reply.
function placeCards(reply: string, ids: string[], found: TurnState["found"]): string {
  const blocks = reply.split(/\n\s*\n/);
  const firstLines = blocks.map((block) => block.split("\n")[0]);
  const heading = (line: string, car: FoundCar) => {
    const bold = line.trimStart().match(/^\*\*([^*]+)\*\*/);
    return Boolean(bold && namesCar(bold[1], car));
  };
  const under = blocks.map((): string[] => []);
  for (const carId of ids) {
    const car = found.get(carId);
    if (!car) continue;
    let at = firstLines.findIndex((line) => heading(line, car));
    if (at < 0) at = firstLines.findIndex((line) => namesCar(line, car));
    if (at >= 0) under[at].push(carId);
  }
  // A comparison names both cars on its first line: both cards go there, in reply order.
  return blocks.map((block, i) => [block, ...under[i].map(carMarker)].join("\n")).join("\n\n");
}

// The model sometimes answers in a paragraph that opens with the car's bold
// name and then adds the same car again as a name + facts caption below
// («**تويوتا كامري 2024** ما عليها صبغ…» then «**تويوتا كامري 2024**\nمستعملة · …»).
// The card already shows those facts: the repeated caption is dropped, unless
// it is the one saying the car is over the budget.
function dropRepeatedBlocks(reply: string, found: TurnState["found"]): string {
  const blocks = reply.split(/\n\s*\n/);
  const opensWith = (block: string) => block.trimStart().match(/^\*\*([^*]+)\*\*/)?.[1];
  const named = (bold: string | undefined) =>
    bold ? [...found].filter(([, car]) => namesCar(bold, car)).map(([id]) => id) : [];
  // Cars already named in bold anywhere in an earlier paragraph ("أرخص سيارة عندنا **كيا بيكانتو 2024**").
  const boldIn = (block: string) => [...block.matchAll(/\*\*([^*]+)\*\*/g)].flatMap((m) => named(m[1]));
  const seen = new Set<string>();
  return blocks
    .filter((block) => {
      const lines = block.trim().split("\n");
      const ids = named(opensWith(block));
      const caption =
        /^\*\*[^*]+\*\*\s*$/.test(lines[0]) &&
        lines.length <= 2 &&
        (lines.length === 1 || lines[1].includes("·")) &&
        !mentionsOverBudget(block);
      const repeat = caption && ids.length > 0 && ids.every((id) => seen.has(id));
      if (!repeat) boldIn(block).forEach((id) => seen.add(id));
      return !repeat;
    })
    .join("\n\n");
}

// «هذي الكامري 2024 **تويوتا كامري 2024**»: the car named twice in a row; the bold one stays.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function dropNameBeforeBold(reply: string, found: TurnState["found"]): string {
  let out = reply;
  for (const car of found.values()) {
    for (const model of new Set([car.name?.model, car.model].filter((n): n is string => Boolean(n)))) {
      const m = escapeRe(model);
      out = out.replace(
        new RegExp(`(?:(?:هذي|هاي|هاذي)\\s+)?(?:ال)?${m}\\s+${car.year}\\s+(?=\\*\\*[^*]*${m}[^*]*${car.year}\\*\\*)`, "g"),
        ""
      );
    }
  }
  return out;
}

// «أكو 14 جيب بالمعرض…» at the top and again at the end: the second one goes,
// with the comma or "و" that joined it to the rest of its sentence.
function dropRepeatedCount(reply: string): string {
  const said = new Set<string>();
  return reply.replace(/(?:أكو|عدنا|عندنا)\s+(\d+)\s+[^\s،.\n]+[^،.\n]*?(?:[،.]\s*و?|(?=\n)|$)/g, (clause, n: string) => {
    if (said.has(n)) return "";
    said.add(n);
    return clause;
  });
}

// The showroom's number as the reply writes it, digits only ("7838548091").
const SHOWROOM_DIGITS = site.whatsapp.replace(/^964/, "");

// A reply that hands the buyer to the team gets WhatsApp and call buttons
// under it, with a WhatsApp message about the car they were looking at.
function contactActions(reply: string, state: TurnState, cars: Car[], history: HistoryMessage[]): ChatAction[] | undefined {
  const givesContact = reply.replace(/\D/g, "").includes(SHOWROOM_DIGITS) || state.request?.intent === "contact";
  if (!givesContact) return undefined;
  const lastShown = [...history].reverse().find((m) => m.role === "assistant" && m.cars?.length)?.cars?.[0];
  const car = cars.length === 1 ? `${cars[0].brand} ${cars[0].model} ${cars[0].year}` : lastShown?.name.split(" – ")[0];
  return [
    {
      kind: "whatsapp",
      label: "راسلنا واتساب",
      href: whatsappHref(car ? `مرحباً، أستفسر عن سيارة ${car}` : "مرحباً، عندي استفسار عن سيارة"),
    },
    { kind: "phone", label: "اتصل بنا", href: phoneHref },
  ];
}

function allowedFigures(state: TurnState, buyerTexts: string[]): AllowedFigures {
  const prices = [...state.seenPrices.values()];
  // The stock overview's price ranges are database facts too ("أرخص سيارة عدنا بـ …").
  const iqd = [...prices, ...state.overBudget.map((c) => c.overBy), ...overviewPrices()];
  // Differences, for "أرخص بـ 4 مليون" in comparisons.
  for (const a of prices) for (const b of prices) if (a > b) iqd.push(a - b);
  if (state.request?.budgetMax) iqd.push(state.request.budgetMax);
  if (state.request?.budgetStated) iqd.push(state.request.budgetStated);
  if (state.request?.budgetMin) iqd.push(state.request.budgetMin);
  const usd = [...prices.map(usdOf), ...state.overBudget.map((c) => usdOf(c.overBy))];
  // Whatever the buyer wrote may be repeated back ("ميزانيتك 20 ألف دولار").
  for (const f of buyerTexts.flatMap(moneyFigures)) (f.currency === "USD" ? usd : iqd).push(f.value);
  return { iqd, usd };
}

// Tools that only look things up: an answer written next to them needs nothing they would add.
const LOOKUP_TOOLS = new Set(["search_cars", "get_car_details", "record_request"]);

// Latin words inside the cars' own texts, which a reply may quote as they are.
const DATA_TEXTS = new Set(["features", "engine", "description"]);
function collectDataLatin(value: unknown, key: string, into: Set<string>) {
  if (typeof value === "string") {
    if (DATA_TEXTS.has(key)) for (const word of value.match(/[A-Za-z]{2,}/g) ?? []) into.add(word.toLowerCase());
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectDataLatin(item, key, into));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectDataLatin(v, k, into);
  }
}

const INTERNAL_TALK = ["استدعاء", "الأداة", "أداة", "قاعدة البيانات", "وصلتني", "وصلني من البحث", "الحفظ فشل", "غلط مني"];

// ---------------------------------------------------------------------------
// Specs the reply quotes (horsepower, mileage, seats, cylinders) must be the
// car's own. Checked per paragraph: one that names cars is held to those cars'
// figures ("**هيونداي توسان 2024** … 180 حصان" is wrong: that's the
// Sportage's); others to any car this conversation has touched. Numbers the
// buyer wrote, and numbers in the cars' own texts ("مدى يقارب 500 كم"), pass.
// ---------------------------------------------------------------------------
const SPEC_PATTERNS = [
  { kind: "hp", re: /(\d{2,4})\s*حصان/g, of: (r: CarRow) => [r.horsepower ?? -1] },
  { kind: "km", re: /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(ألف|الف)?\s*(?:كم|كيلو)(?![\u0621-\u064A])/g, of: (r: CarRow) => [r.mileage_km] },
  { kind: "seats", re: /(\d{1,2})\s*(?:مقاعد|مقعد|ركاب|راكب)/g, of: (r: CarRow) => [r.seats] },
  { kind: "cylinders", re: /(\d{1,2})\s*(?:سلندر|سلندرات|اسطوانات)/g, of: (r: CarRow) => [r.cylinders ?? -1] },
] as const;

const westernDigits = (text: string) => text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٬/g, ",");

function specProblems(reply: string, state: TurnState, cars: CarRow[], buyerTexts: string[]): string[] {
  const buyerNumbers = new Set(buyerTexts.flatMap((t) => westernDigits(t).match(/\d+/g) ?? []).map(Number));
  const byId = new Map(cars.map((car) => [car.id, car]));
  const textNumbers = (list: CarRow[]) =>
    new Set(list.flatMap((c) => `${c.description} ${c.features.join(" ")} ${c.engine}`.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  const problems: string[] = [];
  for (const paragraph of westernDigits(reply).split(/\n\s*\n/)) {
    // Cars the paragraph talks about, by any form of their name (with or without the year).
    const lower = paragraph.toLowerCase();
    const named = [...state.found]
      .filter(([id, car]) => byId.has(id) && [car.model, car.name?.model].some((n) => n && lower.includes(n.toLowerCase())))
      .map(([id]) => byId.get(id)!);
    const pool = named.length ? named : cars;
    const inText = textNumbers(pool);
    for (const { kind, re, of } of SPEC_PATTERNS) {
      for (const m of paragraph.matchAll(re)) {
        const value = Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);
        const known = pool.flatMap(of);
        const near = known.some((k) => (kind === "km" ? Math.abs(k - value) <= Math.max(k * 0.02, 500) : k === value));
        if (near || buyerNumbers.has(Number(m[1].replace(/,/g, ""))) || inText.has(value) || inText.has(Number(m[1]))) continue;
        const who = named.length === 1 ? ` for ${named[0].brand} ${named[0].model} ${named[0].year} (${kind}: ${known.join(", ")})` : "";
        problems.push(`"${m[0].trim()}" is not in the data${who}`);
      }
    }
  }
  return problems;
}

function replyProblems(reply: string, allowed: AllowedFigures, state: TurnState, cars: CarRow[], buyerTexts: string[]): string[] {
  const problems = unsupportedFigures(reply, allowed).map((f) => `"${f}" is not a price from the tools`);
  problems.push(...specProblems(reply, state, cars, buyerTexts));
  if (state.overBudget.length && !mentionsOverBudget(reply)) {
    problems.push(
      `it does not say that ${state.overBudget.map((c) => c.id).join(", ")} cost more than the budget ` +
        `(by ${state.overBudget.map((c) => `${c.overBy.toLocaleString("en-US")} د.ع`).join(", ")})`
    );
  }
  // Counts of cars ("أكو 4 سيارات ثانية") must be what the search found, what
  // the reply shows, or the difference: the model gets the subtraction wrong.
  if (state.counts.length) {
    const shown = state.shownIds.length;
    const ok = new Set([shown, overviewAvailable(), ...state.counts.flatMap((n) => [n, n - shown])]);
    const bad = [...reply.matchAll(/(\d+)\s*(?:سيارة|سيارات|جيب|جيبات|خيار|خيارات)/g)]
      .map((m) => Number(m[1]))
      .filter((n) => n > 1 && n < 1000 && !ok.has(n));
    if (bad.length) {
      problems.push(
        `the count ${bad.join(", ")} is wrong: the search found ${state.counts.at(-1)} available cars and the reply shows ${shown}. ` +
          `Write "أكو ${state.counts.at(-1)} بهذي المواصفات" or leave the count out`
      );
    }
  }
  // Its own workings («ما وصلتني كلها»، «قاعدة البيانات») are not for the buyer.
  const internal = INTERNAL_TALK.filter((w) => reply.includes(w));
  if (internal.length) problems.push(`it talks about your own workings (${internal.join("، ")}): answer the buyer only`);
  // English words: only a model name with no Arabic one (كيا EV6) may stay in Latin letters.
  const latinOk = new Set([
    ...["SUV", ...[...state.found.values()].flatMap((car) => car.name?.full?.match(/[A-Za-z]+/g) ?? [])].map((w) => w.toLowerCase()),
    ...state.dataLatin,
  ]);
  const latin = [...new Set(reply.match(/[A-Za-z]{2,}/g) ?? [])].filter((w) => !latinOk.has(w.toLowerCase()));
  if (latin.length) problems.push(`it has English words (${latin.join(", ")}): write them in Iraqi Arabic`);
  return problems;
}

export async function runSadeem(
  llm: OpenRouterEnv,
  db: SupabaseEnv,
  history: HistoryMessage[],
  message: string,
  onEvent?: (event: SadeemEvent) => void
): Promise<AgentReply> {
  const started = Date.now();
  // One key for every visitor: the instructions are the same for all of them,
  // so routing everyone to the same provider lets a new visitor's first
  // message read the cache an earlier visitor wrote.
  const turn: TurnStats = { sessionKey: "sadeem", calls: [] };
  const state: TurnState = {
    seenIds: new Set(history.flatMap((m) => m.cars?.map((c) => c.id) ?? [])),
    seenPrices: new Map(),
    overBudget: [],
    shownIds: [],
    detailIds: [],
    found: new Map(),
    leadSaved: false,
    searches: [],
    counts: [],
    dataLatin: new Set(),
    message,
  };
  const arabic = await arabicNames(db).catch(() => new Map<string, ArabicName>());
  // Cars shown earlier in the conversation can be named again ("أريد الفورد
  // اكسبلورر 2022") without a new search, and still get their card.
  for (const m of history) {
    for (const c of m.cars ?? []) {
      const label = c.name.split(" – ")[0];
      const year = Number(label.match(/\d{4}$/)?.[0]);
      if (year) state.found.set(c.id, { model: label.replace(/\s*\d{4}$/, ""), name: arabic.get(c.id), year });
    }
  }

  const messages: LlmMessage[] = [
    // The tools and these instructions are the same for every call: providers
    // that cache (Anthropic and Gemini on this marker, OpenAI, DeepSeek and
    // others on their own) then read them back instead of processing them again.
    // An hour, not the default 5 minutes, so the cache outlives quiet spells.
    {
      role: "system",
      content: [{ type: "text", text: await systemPrompt(db), cache_control: { type: "ephemeral", ttl: "1h" } }],
    },
    ...historyToMessages(history, arabic),
    { role: "user", content: message },
  ];

  const buyerGavePhone = /(?:\+?964|0)\s?7\d{2}[\s-]?\d{3}[\s-]?\d{4}/.test(message.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  const answerTexts: string[] = [];
  let finalText = "";
  // The text shown while it is written: earlier answer rounds plus the round
  // being streamed, sent at most every PREVIEW_MS (and once more at its end).
  let roundText = "";
  let shown = "";
  let shownAt = 0;
  const preview = (force = false) => {
    if (!onEvent || (!force && Date.now() - shownAt < PREVIEW_MS)) return;
    let text = hideSuggestions(cleanReply([...answerTexts, roundText].filter(Boolean).join("\n\n")))
      // half an emoji, when a piece ends inside one
      .replace(/[\uD800-\uDBFF]$/, "");
    // a car name still being written: close its bold so no stray ** shows
    if ((text.match(/\*\*/g) ?? []).length % 2) text += "**";
    if (!text || text === shown) return;
    shown = text;
    shownAt = Date.now();
    onEvent({ type: "text", text });
  };
  const streamText = onEvent
    ? (delta: string) => {
        roundText += delta;
        preview();
      }
    : undefined;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    roundText = "";
    // The last round may not call tools again: it has to answer.
    const reply = await complete(llm, messages, round < MAX_ROUNDS - 1, turn, streamText);
    preview(true);
    // Note when OpenRouter answered with the fallback, so chat reviews show it.
    if (llm.fallbackModel && reply.model?.startsWith(llm.fallbackModel) && !state.searches.some((s) => s.fallback)) {
      state.searches.push({ fallback: reply.model });
    }
    // Saving the buyer's number needs a number in their message; models
    // sometimes call it anyway next to a finished reply, which then got lost.
    const calls = (reply.tool_calls ?? []).filter((call) => call.function.name !== "save_lead" || buyerGavePhone);
    const text = cleanReply(reply.content ?? "");
    if (calls.length === 0) {
      finalText = text;
      break;
    }
    // A full answer about the cars, written next to one more lookup after this
    // turn already searched: that answer is the reply. Otherwise the model sends
    // the rest as a separate partial message and the answer itself is lost
    // («تحت الغطاء، السبورتاج والكي 5 محركهم…» with no answer and no cards).
    const searched = state.counts.length > 0 || state.detailIds.length > 0;
    if (searched && text.includes("**") && text.length >= 150 && calls.every((call) => LOOKUP_TOOLS.has(call.function.name))) {
      state.searches.push({ answered_before: calls.map((call) => call.function.name) });
      finalText = text;
      break;
    }
    if (text && calls.some((call) => ANSWER_TOOLS.has(call.function.name))) answerTexts.push(text);
    const status = statusOf(calls.map((call) => call.function.name));
    if (status && !shown) onEvent?.({ type: "status", text: status });
    messages.push({ role: "assistant", content: reply.content, tool_calls: calls, reasoning_details: reply.reasoning_details });
    const results = await Promise.all(
      calls.map(async (call) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          return { error: "Arguments were not valid JSON." };
        }
        return runTool(db, call.function.name, args, state).catch((err: Error) => ({ error: err.message }));
      })
    );
    calls.forEach((call, i) => {
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(results[i]) });
    });
    results.forEach((result) => collectDataLatin(result, "", state.dataLatin));
  }

  let content = joinReply(answerTexts, finalText);
  if (!content) {
    // Some models end a tool turn with no text at all; ask once for the reply itself.
    messages.push({ role: "system", content: "Now write your reply to the buyer in Iraqi Arabic. No tools." });
    roundText = "";
    content = cleanReply((await complete(llm, messages, false, turn, streamText)).content ?? "");
  }

  let suggestions: string[];
  ({ text: content, suggestions } = splitSuggestions(content));

  // Prices of every car this conversation has touched, current from the database.
  const rows = await fetchCars(db, [...state.seenIds]);
  rows.forEach((row) => state.seenPrices.set(row.id, row.price_iqd));
  // The cards under the reply: the cars it names (in its order), then the
  // ones looked up in detail (both sides of a comparison). Only cars a tool
  // returned can be shown.
  const showNamed = (text: string) => {
    const named = mentionedCars(text, state.found);
    markShown(state, [...new Set([...named, ...state.detailIds])].slice(0, MAX_SHOWN_CARS));
  };
  showNamed(content);

  // Check the reply against the facts; one rewrite if it quotes a figure no
  // tool returned or hides that a shown car is over budget.
  if (content) {
    const buyerTexts = [message, ...history.filter((m) => m.role === "user").map((m) => m.content)];
    const allowed = allowedFigures(state, buyerTexts);
    const problems = replyProblems(content, allowed, state, rows, buyerTexts);
    if (problems.length) {
      state.searches.push({ verify: problems });
      messages.push({ role: "assistant", content });
      messages.push({
        role: "system",
        content:
          `Your reply has problems: ${problems.join(" | ")}. Rewrite it in Iraqi Arabic using only facts and figures from the tool results ` +
          `(prices: ${[...state.seenPrices].map(([id, p]) => `${id} ${p.toLocaleString("en-US")} دينار ≈ ${usdOf(p).toLocaleString("en-US")} دولار`).join("; ")}). ` +
          "Keep the same shape, ending with the suggestions line. No tools.",
      });
      onEvent?.({ type: "status", text: "سديم يتأكد من المعلومات…" });
      const fixed = cleanReply((await complete(llm, messages, false, turn)).content ?? "");
      if (fixed) {
        const rewritten = splitSuggestions(fixed);
        const left = replyProblems(rewritten.text, allowed, state, rows, buyerTexts);
        if (left.length) state.searches.push({ verify_after_rewrite: left });
        content = rewritten.text;
        if (rewritten.suggestions.length) suggestions = rewritten.suggestions;
        showNamed(content);
      }
    }
  }

  const cars = state.shownIds
    .map((id) => rows.find((row) => row.id === id))
    .filter((row) => row !== undefined)
    .map(toCar);

  state.searches.push({ timing: { total_ms: Date.now() - started, calls: turn.calls } });
  if (content) content = dropRepeatedCount(dropRepeatedBlocks(dropNameBeforeBold(content, state.found), state.found));
  const finalContent = content || (cars.length ? "هاي أقرب السيارات لطلبك 👇" : "ما فهمت طلبك زين، تگدر توضحلي أكثر؟");

  return {
    // Cards between the paragraphs; the contact check reads the text itself.
    content: cars.length ? placeCards(finalContent, state.shownIds, state.found) : finalContent,
    cars,
    quickReplies: suggestions,
    leadSaved: state.leadSaved,
    matchCount: cars.length ? state.matchCount : undefined,
    actions: contactActions(finalContent, state, cars, history),
    searches: state.searches,
  };
}
