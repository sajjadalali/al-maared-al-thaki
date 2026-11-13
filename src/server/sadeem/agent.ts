// One Sadeem reply: the LLM (via OpenRouter) reads the conversation, calls the
// catalog tools as often as it needs, then answers. Returns the text plus the
// cars it chose to show, loaded fresh from the database.
import { phoneHref, site, whatsappHref } from "@/config/site";
import type { SupabaseEnv } from "@/server/supabase";
import { carMarker, stripCarMarkers } from "@/services/ai/carMarkers";
import { carNameAr } from "@/lib/format";
import { contactMessage } from "./contact";
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
    // Levantine «حكى» and «تبع», and forms the model writes with ق where Iraqis say گ.
    ["تحكي", "تحچي"], ["يحكي", "يحچي"], ["نحكي", "نحچي"], ["أحكي|احكي", "أحچي"], ["يحكون", "يحچون"], ["تحكون", "تحچون"],
    ["تبعي", "مالتي"], ["تبعك", "مالتك"], ["تبعنا", "مالتنا"], ["تبعكم", "مالتكم"],
    ["معانا", "ويانا"], ["معاك", "وياك"], ["معاهم", "وياهم"], ["فيك", "بيك"], ["فينا", "بينا"],
    ["لقيت", "لگيت"], ["لقيتها", "لگيتها"], ["لقيته", "لگيته"], ["لقيتلك", "لگيتلك"], ["لقينا", "لگينا"],
    ["أقولك|اقولك|أقلك|اقلك|أكلك|اكلك", "أگلك"], ["نقولك|نقلك", "نگلك"], ["يقولون", "يگولون"], ["قلّي|قلي", "گلّي"], ["يكلك", "يگلك"], ["يكلي", "يگلي"], ["تكلي", "تگلي"], ["قولي", "گلّي"], ["اتنين", "ثنين"],
    ["أبحث لك|أبحثلك|ابحث لك|ابحثلك", "أدورلك"], ["أبحث|ابحث", "أدوّر"], ["نبحث", "ندوّر"], ["تبحث", "تدوّر"], ["يبحث", "يدوّر"],
    ["بالوقت الحالي|في الوقت الحالي", "هسه"], ["هلق|هلأ", "هسه"], ["كتير", "هواية"], ["هيك", "هيچ"],
    // From a buyer's own test (13 Nov): «يكدرون»، «أعطيك»، «أوريك إياه»، «شاشتان».
    ["يكدرون|يقدرون", "يگدرون"], ["تكدرون|تقدرون", "تگدرون"], ["أكول|اكول", "أگول"], ["شكدك", "شلونك"], ["شكدكم", "شلونكم"], ["مساعدة المبيعات", "مساعد المبيعات"],
    ["أعطيك|اعطيك", "أنطيك"], ["أعطيكم|اعطيكم", "أنطيكم"], ["نعطيك", "ننطيك"], ["يعطيك", "ينطيك"], ["تعطيني", "تنطيني"],
    ["أوريك|اوريك", "أراويك"], ["أوريكم|اوريكم", "أراويكم"], ["نوريك", "نراويك"],
    ["إياه|اياه", "ياه"], ["إياها|اياها", "ياها"], ["إياهم|اياهم", "ياهم"],
    ["شاشتان", "شاشتين"], ["سيارتان", "سيارتين"], ["كاميرتان", "كاميرتين"], ["فتحتان", "فتحتين"], ["مرتان", "مرتين"],
    ["مقعدان", "مقعدين"], ["بابان", "بابين"], ["لونان", "لونين"],
  ] as const
).map(([words, iraqi]) => [new RegExp(`(^|[^${AR_LETTER}])([وف]?)(?:${words})(?![${AR_LETTER}])`, "g"), `$1$2${iraqi}`] as const);

// Persian kaf and yeh the model sometimes writes («کامری»); گ and چ are Iraqi and stay.
// Money in words, as the site writes it: دينار and دولار, not «د.ع» and «$».
// «معك حق» is "you're right": Iraqis say «عندك حق». Before the word list, which
// would make it «وياك حق» (13 Nov), a phrase no Iraqi says.
const YOU_ARE_RIGHT = new RegExp(`(^|[^${AR_LETTER}])(?:معك|معاك|وياك)\\s+حق(?![${AR_LETTER}])`, "g");
const YOU_ARE_RIGHT_ALL = new RegExp(`(^|[^${AR_LETTER}])(?:معكم|معاكم|وياكم)\\s+حق(?![${AR_LETTER}])`, "g");
// «حق» as "of" («التجهيزات حق وحدة منهم»، «مساعد حق المعرض») is Gulf: Iraqis say
// «مال». A rewrite asked to fix it kept it (13 Nov), so the server does it.
// «عندك حق» and «الحق» are left alone.
const HAQ_OF = new RegExp(`(^|[^${AR_LETTER}])(?<!(?:عندك|عندكم|عنده|عندها|عندي)\\s+)حق(?![${AR_LETTER}])`, "g");
// «كم» asking how many is «شكد» («وكم مقعد تحتاج» → «وشكد مقعد تحتاج»); after a
// number it is kilometres («21,000 كم»، «21 ألف كم») and stays.
const KAM_QUESTION = new RegExp(`(?<!(?:\\d|ألف|الف|آلاف)[\\s,،]*)(^|[^${AR_LETTER}\\d])(و?)كم(?=\\s+[${AR_LETTER}])`, "g");
const toIraqi = (text: string) =>
  IRAQI_WORDS.reduce(
    (out, [re, iraqi]) => out.replace(re, iraqi),
    text
      .replace(YOU_ARE_RIGHT, "$1عندك حق")
      .replace(YOU_ARE_RIGHT_ALL, "$1عندكم حق")
      .replace(HAQ_OF, "$1مال")
      .replace(KAM_QUESTION, "$1$2شكد")
  )
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

// A car named in bold twice («أرخص شي عندنا **كيا بيكانتو 2024**…» and then its
// block): the last one is the block, where the card goes; the earlier ones go plain.
const boldOnce = (text: string) => {
  const seen = new Map<string, number>();
  for (const m of text.matchAll(/\*\*([^*\n]+)\*\*/g)) seen.set(m[1].trim(), (seen.get(m[1].trim()) ?? 0) + 1);
  return text.replace(/\*\*([^*\n]+)\*\*/g, (all, inner: string) => {
    const name = inner.trim();
    const left = seen.get(name) ?? 0;
    if (left <= 1 || !/(19|20)\d\d/.test(name)) return all;
    seen.set(name, left - 1);
    return inner;
  });
};

// Card markers are placed by the server only: any the model copies from a
// history that still had them would show the cards twice.
const cleanReply = (text: string) =>
  boldOnce(boldCarsOnly(toIraqi(stripCarMarkers(text))))
    // "بـ" glued to a word once its bold is gone: «بـبغداد» → «ببغداد».
    .replace(/بـ(?=[\u0621-\u064A])/g, "ب")
    // «بـ» before a word that already has its «ب» («بـ**ببغداد**» → «بببغداد»): Arabic never has three in a row.
    .replace(/ب{3,}/g, "بب")
    // Stretched letters («ســيارة»): a tatweel between two letters.
    .replace(/(?<=[\u0621-\u064A])ـ+(?=[\u0621-\u064A])/g, "")
    // «تحب أعرف تفاصيل…» says "would you like me to know": the model means «أگلك».
    .replace(/(تحب|تريد|تحبون|تريدون)\s+أعرف(?=\s+(?:تفاصيل|شي|أكثر|اكثر|عن|مواصفات|تجهيزات))/g, "$1 أگلك")
    // A tag word left alone before the closing question («اقتصادية.. تحب أگلك…»).
    .replace(/(^|\n)[ \t]*(?:اقتصادية|فاخرة|فخمة)[ \t]*(?:\.{2,}|…)[ \t]*/g, "$1")
    .replace(/هلا وغلاي/g, "هلا وغلا")
    // «هلا وياك» (from «هلا معك»): the greeting is «هلا بيك».
    .replace(/هلا وياك(?![\u0621-\u064A])/g, "هلا بيك")
    // «عشان» is Gulf: «حتى» before a verb («عشان تقارن» → «حتى تقارن»), «لأن» otherwise.
    .replace(/(^|[^\u0621-\u064A])(و?)(?:عشان|علشان)(?=\s+[تيأن])/g, "$1$2حتى")
    .replace(/(^|[^\u0621-\u064A])(و?)(?:عشان|علشان)(?![\u0621-\u064A])/g, "$1$2لأن")
    // «ببحدود»: «ب» written before «بحدود».
    .replace(/ببحدود/g, "بحدود")
    // «وياكد لك» is «ويأكد لك» misspelled.
    .replace(/(^|[^\u0621-\u064A])وياكد/g, "$1ويأكد")
    // «أكو 2 سيارات» → «أكو سيارتين».
    .replace(/(أكو|عدنا|عندنا)\s+2\s+سيار(?:ات|ة)/g, "$1 سيارتين")
    .replace(/\[من قاعدة البيانات[^\]]*\]/g, "")
    // A car id written into the text («[car-026]»): the card is the server's to place.
    .replace(/[ \t]*\[{1,2}(?:car:)?car-\d{3}\]{1,2}/g, "")
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
// For matching car names: case and the alef forms the model writes either way
// («الإكسبلورر» for «اكسبلورر»). One letter for one, so positions stay the same.
const fold = (text: string) => text.toLowerCase().replace(/[أإآ]/g, "ا");

function namesCar(line: string, car: FoundCar): boolean {
  const lower = fold(line);
  const names = [car.model, car.name?.full, car.name?.model].filter((n): n is string => Boolean(n));
  return lower.includes(String(car.year)) && names.some((n) => lower.includes(fold(n)));
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
  // Where each car was first named in bold, to tell whether a caption adds anything.
  const seen = new Map<string, string>();
  return blocks
    .filter((block) => {
      const lines = block.trim().split("\n");
      const ids = named(opensWith(block));
      // An over-budget caption stays unless the earlier mention already gave the same figures
      // («أغلى من ميزانيتك بـ 17,000,000» in the opening line, then again in the caption).
      const figures = block.match(/\d{1,3}(?:,\d{3})+/g) ?? [];
      const overSaid = (id: string) => figures.length > 0 && figures.every((f) => seen.get(id)?.includes(f));
      const caption =
        /^\*\*[^*]+\*\*\s*$/.test(lines[0]) && lines.length <= 2 && (lines.length === 1 || lines[1].includes("·"));
      const repeat =
        caption &&
        ids.length > 0 &&
        ids.every((id) => seen.has(id) && (!mentionsOverBudget(block) || overSaid(id)));
      if (!repeat) boldIn(block).forEach((id) => seen.has(id) || seen.set(id, block));
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
// A count said in words first («عدنا سيارتين…») and then as the closing
// «أكو 2 بهذي المواصفات» is the same count too; only that closing formula is
// dropped then, never another sentence that happens to hold the same number.
const COUNT_NOUNS = "سيارات|سيارة|جيبات|جيب|خيارات|خيار|كوريات|موديلات";
const COUNT_WORDS: [RegExp, number][] = [
  [/(?:سيارت|جيب|خيار|موديل|نسخت|وحدت|كامري)ين(?![\u0621-\u064A])/g, 2],
  ...(
    [
      ["اثنين|اثنتين|ثنتين", 2], ["ثلاث|ثلاثة|تلاث", 3], ["أربع|اربع|أربعة|اربعة", 4], ["خمس|خمسة", 5],
      ["ست|ستة", 6], ["سبع|سبعة", 7], ["ثمان|ثماني|ثمانية", 8], ["تسع|تسعة", 9], ["عشر|عشرة", 10],
    ] as const
  ).map(([words, n]): [RegExp, number] => [new RegExp(`(?<![\\u0621-\\u064A])(?:${words})\\s+(?:${COUNT_NOUNS})(?![\\u0621-\\u064A])`, "g"), n]),
];

function dropRepeatedCount(reply: string): string {
  const inWords = COUNT_WORDS.flatMap(([re, n]) => [...reply.matchAll(re)].map((m) => ({ n: String(n), at: m.index ?? 0 })));
  const said = new Set<string>();
  return reply.replace(/(?:أكو|عدنا|عندنا)\s+(\d+)\s+[^\s،.\n]+[^،.\n]*?(?:[،.]\s*و?|(?=\n)|$)/g, (clause, n: string, at: number) => {
    const restatesWords = /بهذي المواصفات|بنفس المواصفات/.test(clause) && inWords.some((w) => w.n === n && w.at < at);
    if (said.has(n) || restatesWords) return "";
    said.add(n);
    return clause;
  });
}

// In a facts line («زيرو · وكالة · رباعي») the drivetrain alone reads oddly: «دفع رباعي».
const DRIVETRAINS = new Set(["رباعي", "كلي", "أمامي", "خلفي"]);
function spellDrivetrain(reply: string): string {
  return reply
    .split("\n")
    .map((line) =>
      line.includes("·")
        ? line
            .split("·")
            .map((part) => (DRIVETRAINS.has(part.trim()) ? part.replace(part.trim(), `دفع ${part.trim()}`) : part))
            .join("·")
        : line
    )
    .join("\n");
}

// The showroom's number as the reply writes it, digits only ("7838548091").
const SHOWROOM_DIGITS = site.whatsapp.replace(/^964/, "");
const CREATOR_QUESTION = /صممك|صمّمك|صنعك|سواك|سوّاك|برمجك|طورك|طوّرك|مطورك|مطوّرك|صانعك|مبرمجك|سوّتك|سوتك/;

// The car the WhatsApp message names: one the buyer was looking at on its own,
// in this reply or the one just before it. A list of cars, or a car from
// further back, is not their choice (13 Nov: a buyer who never picked a car got
// «أستفسر عن سيارة Nissan Patrol 2026», the first car of an older list).
export function contactCar(cars: Car[], history: HistoryMessage[], arabic: Map<string, ArabicName>): string | undefined {
  if (cars.length === 1) return `${arabic.get(cars[0].id)?.full ?? carNameAr(cars[0])} ${cars[0].year}`;
  if (cars.length) return undefined;
  const previous = [...history].reverse().find((m) => m.role === "assistant");
  const only = previous?.cars?.length === 1 ? previous.cars[0] : undefined;
  return only ? noteName(only.id, only.name, arabic).split(" – ")[0] : undefined;
}

// A reply that hands the buyer to the team gets WhatsApp and call buttons under it.
function contactActions(
  reply: string,
  state: TurnState,
  cars: Car[],
  history: HistoryMessage[],
  arabic: Map<string, ArabicName>,
  message: string
): ChatAction[] | undefined {
  // A question about who built Sadeem is not a contact request, even when the model files it as one.
  const askedTeam = state.request?.intent === "contact" && !CREATOR_QUESTION.test(message);
  const givesContact = reply.replace(/\D/g, "").includes(SHOWROOM_DIGITS) || askedTeam;
  if (!givesContact) return undefined;
  return [
    { kind: "whatsapp", label: "راسلنا واتساب", href: whatsappHref(contactMessage(contactCar(cars, history, arabic))) },
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

const INTERNAL_TALK = [
  "استدعاء", "الأداة", "أداة", "قاعدة البيانات", "وصلتني", "وصلني من البحث", "الحفظ فشل", "غلط مني",
  // About its own earlier reply, from a rewrite (13 Nov: «أرجع وأصحح: الرد السابق ما كان بالعراقي الصحيح»).
  "الرد السابق", "ردي السابق", "أرجع وأصحح", "هذا التصحيح",
];

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
    const lower = fold(paragraph);
    const named = [...state.found]
      .filter(([id, car]) => byId.has(id) && [car.model, car.name?.model].some((n) => n && lower.includes(fold(n))))
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

// With the Persian letters of Iraqi words (چ گ پ): «وياهم تحچي» slipped past without them (13 Nov).
const AR = "\\u0621-\\u064A\\u0686\\u06AF\\u067E";
const word = (words: string) => new RegExp(`(?:^|[^${AR}])([وف]?(?:${words}))(?![${AR}])`, "g");

// «ويا» means "with" and follows a verb that takes it (تواصل وياهم، يتفقون وياك).
// The model also writes it as "and" or before a verb or noun, which reads as
// garbled: «اكتبلهم على الواتساب وياهم يردون عليك»، «وياهم تحجي»، «تحجي وياه الفريق».
const WAYA_MISUSE = [
  new RegExp(`واتساب\\s+ويا(?:هم|ك|نا|كم|ه|ها)(?![${AR}])`, "g"),
  new RegExp(`ويا(?:هم|ك|نا|كم|ه|ها)\\s+[يتن][${AR}]{2,}`, "g"),
  new RegExp(`ويا(?:هم|ك|ه|ها)\\s+ال[${AR}]+`, "g"),
  new RegExp(`(?:أسجل|اسجل)[${AR}]*\\s+ويا(?:ك|كم)(?![${AR}])`, "g"),
  new RegExp(`ويا(?:ه|ها|هم)\\s+(?:فريق|الفريق)`, "g"),
];
// Formal, Levantine or Egyptian words with no one-word Iraqi swap (the sentence
// needs rewording): هل، تم، أيضاً… «كم» is checked apart: after a number it is كيلومتر.
const NOT_IRAQI = word("هل|تم|يتم|أيضاً|أيضا|ايضاً|ايضا|لذلك|بالإضافة|بالاضافة|حيث|بدي|شو|عايز|عاوز|إزاي|ازاي|ليه|إيش|ايش|حق");

// Phrases that make no sense in Iraqi, from a buyer's own test (13 Nov):
// «معليك 🙏 خذ كلامك»، «آسف... لا، ما آسف».
const NONSENSE = [/خذ كلامك/, /معليك/, /لا،?\s*ما آسف/, /ما آسف/, /(?:\.{2,}|…)\s*لا[،,]/];

const RIGHT_PHRASES = new RegExp(`(?:عندك|عندكم|عنده|عندها|عندي)\\s+(?:ال)?حق(?![${AR_LETTER}])|الحق\\s+ويا[${AR_LETTER}]*`, "g");

function dialectProblems(reply: string): string[] {
  const found = new Set<string>();
  for (const re of WAYA_MISUSE) for (const m of reply.matchAll(re)) found.add(m[0].trim());
  for (const re of NONSENSE) {
    const m = reply.match(re);
    if (m) found.add(m[0]);
  }
  // «حق» as "of" («مساعد حق المعرض») is Gulf; «عندك حق» ("you're right") and «الحق وياك» are Iraqi.
  for (const m of reply.replace(RIGHT_PHRASES, " ").matchAll(NOT_IRAQI)) found.add(m[1]);
  for (const m of reply.matchAll(word("كم"))) {
    const before = reply.slice(0, m.index + m[0].indexOf(m[1])).trimEnd();
    // «21,000 كم»، «15 ألف كم»: kilometres.
    if (!/(?:[\d٠-٩]|ألف|الف|آلاف)$/.test(before)) found.add(m[1]);
  }
  return found.size
    ? [
        `it is not natural Iraqi (${[...found].join("، ")}): ويا means "with" and only follows a verb that takes it ` +
          `(تواصل وياهم، يتفقون وياك), never "and" and never before a verb; هل/تم/أيضاً/كم and Levantine words are not Iraqi ` +
          `(شكد not كم، هم not أيضاً). Reword those sentences the way a Baghdad salesman says them`,
      ]
    : [];
}

// Comparisons between the cars in the reply («الباجيرو أرخص») must hold for
// their prices, years, power and mileage: the model has called the dearer one
// the cheaper one.
const COMPARATIVES: { re: RegExp; of: (c: CarRow) => number | null; lowest: boolean; what: string }[] = [
  // Matched against the folded reply (أ/إ/آ → ا), so the words are written with «ا».
  { re: word("ارخص|اقل سعر|سعره اقل|سعرها اقل|بسعر اقل"), of: (c) => c.price_iqd, lowest: true, what: "price" },
  { re: word("اغلى|اعلى سعر|سعره اعلى|سعرها اعلى|بسعر اعلى"), of: (c) => c.price_iqd, lowest: false, what: "price" },
  { re: word("احدث"), of: (c) => c.year, lowest: false, what: "year" },
  { re: word("اقدم"), of: (c) => c.year, lowest: true, what: "year" },
  { re: word("اقوى|قوته اعلى|قوتها اعلى|اعلى قوة|قوة اعلى"), of: (c) => c.horsepower ?? null, lowest: false, what: "horsepower" },
  { re: word("اضعف|قوته اقل|قوتها اقل|اقل قوة"), of: (c) => c.horsepower ?? null, lowest: true, what: "horsepower" },
  { re: word("اقل ممشى|ممشاه اقل|ممشاها اقل|ممشى اقل"), of: (c) => c.mileage_km, lowest: true, what: "mileage" },
  { re: word("اكثر ممشى|ممشاه اكثر|ممشاها اكثر|ممشى اكثر|ممشى اعلى"), of: (c) => c.mileage_km, lowest: false, what: "mileage" },
];

function comparisonProblems(reply: string, cars: CarRow[], found: TurnState["found"]): string[] {
  const names = (id: string) => {
    const car = found.get(id);
    return [car?.name?.model, car?.model].filter((n): n is string => Boolean(n && n.length > 1)).map(fold);
  };
  const lower = fold(reply);
  const inReply = cars.filter((c) => names(c.id).some((n) => lower.includes(n)));
  if (inReply.length < 2) return [];
  const problems: string[] = [];
  for (const clause of lower.split(/[،,.؛\n!؟?]/)) {
    const at = inReply
      .flatMap((c) => names(c.id).map((n) => ({ c, i: clause.indexOf(n), len: n.length })))
      .filter((x) => x.i >= 0);
    if (!at.length) continue;
    for (const cmp of COMPARATIVES) {
      for (const m of clause.matchAll(cmp.re)) {
        const pos = m.index + m[0].indexOf(m[1]);
        const after = clause.slice(pos + m[1].length);
        // «أغلى من ميزانيتك»، «أرخص من 30 مليون»، «أرخص 3 منها»: not between the cars.
        if (/^\s*(?:من\s+)?(?:ميزاني|[\d٠-٩]|ال?ـ?\s*[\d٠-٩])/.test(after)) continue;
        // «أرخص وحدة من اللي عرضتهم»، «أرخص منهم»: among cars named elsewhere, not checked here.
        if (/^\s*(?:وحدة\s+|سيارة\s+)?(?:من\s+(?:اللي|الي|هذول|هذني)|منهم|منهن|منها|بيهم|بيهن|بيناتهم)/.test(after)) continue;
        const before = at.filter((x) => x.i + x.len <= pos).sort((a, b) => b.i - a.i)[0];
        const subject = before?.c ?? at.filter((x) => x.i > pos).sort((a, b) => a.i - b.i)[0]?.c;
        if (!subject) continue;
        // «X أرخص من Y»: just those two; otherwise X against every car in the reply.
        const other = at.find((x) => x.c.id !== subject.id && x.i > pos && /^\s*(?:بشوي\s+)?من\s/.test(clause.slice(pos + m[1].length, x.i)));
        const rivals = (other ? [other.c] : inReply).filter((c) => c.id !== subject.id);
        const mine = cmp.of(subject);
        const theirs = rivals.map(cmp.of).filter((v): v is number => v !== null);
        if (mine === null || !theirs.length) continue;
        const holds = cmp.lowest ? theirs.every((v) => mine <= v) : theirs.every((v) => mine >= v);
        if (!holds) {
          const facts = [subject, ...rivals].map((c) => `${c.brand} ${c.model} ${c.year}: ${cmp.of(c)}`).join("; ");
          problems.push(`«${clause.trim()}» is wrong for the ${cmp.what} (${facts})`);
        }
      }
    }
  }
  return problems;
}

// Cities a reply may name: each car is in its own city («الكامري… ببغداد… لا، بكربلاء»
// put a car in Karbala in Baghdad first). Matched folded, with و/ب/ف and ال in front.
const CITIES = ["بغداد", "البصرة", "أربيل", "النجف", "كربلاء", "الموصل", "السليمانية", "كركوك", "دهوك", "الحلة", "بابل",
  "الناصرية", "العمارة", "ميسان", "الديوانية", "الكوت", "واسط", "الرمادي", "الأنبار", "تكريت", "بعقوبة", "ديالى", "السماوة"];
const placeRe = (name: string) => {
  const base = fold(name).replace(/^ال/, "");
  return new RegExp(`(?:^|[^${AR}])[وفب]?(?:ب)?(?:ال)?${base}(?![${AR}])`);
};
const CITY_RES = CITIES.map((city) => ({ city, re: placeRe(city) }));

function cityProblems(reply: string, shown: CarRow[], buyerTexts: string[]): string[] {
  if (!shown.length) return [];
  const own = new Set(shown.map((c) => fold(c.city).replace(/^ال/, "")));
  const asked = fold(buyerTexts.join(" "));
  const text = fold(reply);
  const wrong = CITY_RES.filter(({ city, re }) => !own.has(fold(city).replace(/^ال/, "")) && re.test(text) && !re.test(asked)).map((x) => x.city);
  return wrong.length
    ? [`it names ${wrong.join("، ")}, but the cars in this reply are in ${[...new Set(shown.map((c) => c.city))].join("، ")}: name only each car's own city`]
    : [];
}

// A model the reply names that no tool returned this conversation («التوسان هذا
// بأربيل» about the Sportage), unless the buyer named it.
function strayModelProblems(reply: string, allNames: Map<string, ArabicName>, found: TurnState["found"], buyerTexts: string[]): string[] {
  const byName = new Map<string, string[]>();
  for (const [id, name] of allNames) {
    if (!/[\u0621-\u064A]/.test(name.model)) continue;
    byName.set(name.model, [...(byName.get(name.model) ?? []), id]);
  }
  const text = fold(reply);
  const asked = fold(buyerTexts.join(" "));
  const stray = [...byName]
    .filter(([name, ids]) => !ids.some((id) => found.has(id)) && placeRe(name).test(text) && !placeRe(name).test(asked))
    .map(([name]) => name);
  return stray.length ? [`it names ${stray.join("، ")}, which no search returned: talk only about the cars in the tool results`] : [];
}

function replyProblems(
  reply: string,
  allowed: AllowedFigures,
  state: TurnState,
  cars: CarRow[],
  buyerTexts: string[],
  allNames: Map<string, ArabicName>,
  previousIds: string[] = []
): string[] {
  const problems = unsupportedFigures(reply, allowed).map((f) => `"${f}" is not a price from the tools`);
  // The same cars as the previous reply: the buyer has them already (13 Nov:
  // «بمليار»، «بمليار دولار»، «2 مليار دولار» and then «جوابك غبي» got the same three).
  const named = mentionedCars(reply, state.found);
  // Details or a comparison of those same cars is fine; anything else (a new
  // search, an insult answered with the list again) is not.
  if (
    state.request?.intent !== "details" &&
    state.request?.intent !== "compare" &&
    named.length &&
    previousIds.length === named.length &&
    named.every((id) => previousIds.includes(id))
  ) {
    problems.push(
      `it lists the same cars the buyer just saw: don't list them again. Say in one line that it's the same cars as above (نفس السيارات اللي فوگ) and ask the one thing that narrows it (use, seats, type). ` +
        `Never say there are no others («ماكو غيرهم»): the showroom has ${overviewAvailable()} cars`
    );
  }
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
  // Two counts that contradict each other: «عدنا 3 سيارات … وأكو 4 بهذي المواصفات».
  if (state.counts.length) {
    const total = state.counts.at(-1)!;
    const shownCount = state.shownIds.length;
    const said = new Set(
      [...westernDigits(reply).matchAll(/(?:عدنا|عندنا|أكو|لگينا)\s+(\d+)(?!\s*(?:مقاعد|مقعد|ركاب|حصان|كم|ألف|مليون|دولار|دينار))/g)].map((m) => Number(m[1]))
    );
    if (shownCount < total && said.has(total) && said.has(shownCount)) {
      problems.push(`it gives two counts (${shownCount} and ${total}): the search found ${total}; say «أكو ${total}» once and show the best ${shownCount} without another count`);
    }
  }
  problems.push(...dialectProblems(reply));
  problems.push(...comparisonProblems(reply, cars, state.found));
  problems.push(...cityProblems(reply, cars.filter((c) => state.shownIds.includes(c.id)), buyerTexts));
  problems.push(...strayModelProblems(reply, allNames, state.found, buyerTexts));
  // Its own workings («ما وصلتني كلها»، «قاعدة البيانات») are not for the buyer.
  // Asked about whoever built Sadeem, it gave the showroom's number (13 Nov,
  // twice): the team sells cars, they don't answer for the assistant.
  if (CREATOR_QUESTION.test(buyerTexts[0] ?? "") && reply.replace(/\D/g, "").includes(SHOWROOM_DIGITS)) {
    problems.push("the buyer asked about who built you, not about the cars: no showroom number; one line that you are Sadeem, the showroom's sales assistant, with no details about who built you, then ask what car they want");
  }
  // This site writes the WhatsApp button's message, not WhatsApp (13 Nov:
  // «الرسالة الجاهزة تنكتب تلقائياً من الواتساب»).
  if (/(?:تنكتب|ينكتب)[^\n]{0,30}(?:من|ب)\s*(?:ال)?واتساب|(?:ال)?واتساب\s+(?:هو\s+)?(?:اللي\s+)?(?:يكتبها|كتبها|يكتب\s+الرسالة)/.test(reply)) {
    problems.push("the WhatsApp message is written by this site, not by WhatsApp: say the site writes it ready and the buyer can change it before sending");
  }
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
  // What the model wrote, before cleanReply and the other fixes: kept in the
  // log so a reply's wording can be traced to the model or to the server.
  const modelTexts: string[] = [];
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
    if (reply.content) modelTexts.push(reply.content);
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
    const late = (await complete(llm, messages, false, turn, streamText)).content ?? "";
    if (late) modelTexts.push(late);
    content = cleanReply(late);
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
    // The prompt asks for at most MAX_SHOWN_CARS, but a car named with its year
    // in passing («وأغلاها توسان 2024 بـ 31,000,000») still gets its card: one more.
    markShown(state, [...new Set([...named, ...state.detailIds])].slice(0, MAX_SHOWN_CARS + 1));
  };
  showNamed(content);

  // Check the reply against the facts; one rewrite if it quotes a figure no
  // tool returned or hides that a shown car is over budget.
  if (content) {
    const buyerTexts = [message, ...history.filter((m) => m.role === "user").map((m) => m.content)];
    const allowed = allowedFigures(state, buyerTexts);
    // The last cars the buyer saw, within the last three replies (13 Nov: an
    // insult in between, and «2 مليار دولار» got the «بمليار» cars again).
    const previous = history.filter((m) => m.role === "assistant").slice(-3).reverse().find((m) => m.cars?.length);
    const previousIds = (previous?.cars ?? []).map((c) => c.id);
    const problems = replyProblems(content, allowed, state, rows, buyerTexts, arabic, previousIds);
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
      const rewrite = (await complete(llm, messages, false, turn)).content ?? "";
      if (rewrite) modelTexts.push(`[rewrite] ${rewrite}`);
      const fixed = cleanReply(rewrite);
      if (fixed) {
        const rewritten = splitSuggestions(fixed);
        const left = replyProblems(rewritten.text, allowed, state, rows, buyerTexts, arabic, previousIds);
        if (left.length) state.searches.push({ verify_after_rewrite: left });
        // A rewrite that fixed nothing, or added a problem, is no better than the
        // reply it replaces and has drifted from it (13 Nov: a correct «ما اخترت
        // أي سيارة» reply came back as a list of the cars from earlier).
        // Swapping one problem for another is no fix either (13 Nov: «وكم مقعد»
        // fixed, «الرد السابق» and the Chinese cars from earlier added).
        const added = left.some((p) => !problems.includes(p));
        if (!added && left.length < problems.length) {
          content = rewritten.text;
          if (rewritten.suggestions.length) suggestions = rewritten.suggestions;
          // The cards follow the rewritten text: a car it no longer names loses its card.
          state.shownIds.length = 0;
          showNamed(content);
        } else {
          state.searches.push({ rewrite_dropped: true });
        }
      }
    }
  }

  const cars = state.shownIds
    .map((id) => rows.find((row) => row.id === id))
    .filter((row) => row !== undefined)
    .map(toCar);

  if (modelTexts.length) state.searches.push({ model_text: modelTexts });
  state.searches.push({ timing: { total_ms: Date.now() - started, calls: turn.calls } });
  if (content) content = spellDrivetrain(dropRepeatedCount(dropRepeatedBlocks(dropNameBeforeBold(content, state.found), state.found)));
  const finalContent = content || (cars.length ? "هاي أقرب السيارات لطلبك 👇" : "ما فهمت طلبك زين، تگدر توضحلي أكثر؟");

  return {
    // Cards between the paragraphs; the contact check reads the text itself.
    content: cars.length ? placeCards(finalContent, state.shownIds, state.found) : finalContent,
    cars,
    quickReplies: suggestions,
    leadSaved: state.leadSaved,
    matchCount: cars.length ? state.matchCount : undefined,
    actions: contactActions(finalContent, state, cars, history, arabic, message),
    searches: state.searches,
  };
}
