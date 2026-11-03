// One Sadeem reply: the LLM (via OpenRouter) reads the conversation, calls the
// catalog tools as often as it needs, then answers. Returns the text plus the
// cars it chose to show, loaded fresh from the database.
import { phoneHref, site, whatsappHref } from "@/config/site";
import type { SupabaseEnv } from "@/server/supabase";
import { carMarker } from "@/services/ai/carMarkers";
import type { ChatAction } from "@/services/ai/types";
import type { Car } from "@/types/car";
import { overviewPrices, systemPrompt } from "./prompt";
import { readCompletionStream } from "./stream";
import { toCar } from "@/server/catalog";
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

// Gulf/Levantine words models slip into, with their Iraqi equivalents.
const IRAQI_WORDS = (
  [
    ["تبي|تبغى|تبغي|بدك", "تريد"], ["يبي|يبغى|يبغي|بده", "يريد"], ["الحين|دلوقتي", "هسه"],
    ["وايد", "هواية"], ["كويس|منيح", "زين"], ["تكدر", "تگدر"], ["يكدر", "يگدر"],
  ] as const
).map(([words, iraqi]) => [new RegExp(`(^|[^\\u0600-\\u06FF])([وف]?)(?:${words})(?![\\u0600-\\u06FF])`, "g"), `$1$2${iraqi}`] as const);

const toIraqi = (text: string) => IRAQI_WORDS.reduce((out, [re, iraqi]) => out.replace(re, iraqi), text);

// Drops notes the model sometimes adds for itself: English ones ("the reply
// above is in the chat…"; every line meant for the buyer has Arabic in it) and
// copies of the database notes that history carries.
const cleanReply = (text: string) =>
  toIraqi(text)
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

// Each car's card right under its paragraph (the one whose first line names
// it); cards for cars without one stay under the reply.
function placeCards(reply: string, ids: string[], found: TurnState["found"]): string {
  const left = new Set(ids);
  return reply
    .split(/\n\s*\n/)
    .map((block) => {
      // A comparison names both cars on its first line: both cards go there.
      const first = block.split("\n")[0];
      const here = [...left].filter((carId) => {
        const car = found.get(carId);
        return car && namesCar(first, car);
      });
      here.forEach((carId) => left.delete(carId));
      return [block, ...here.map(carMarker)].join("\n");
    })
    .join("\n\n");
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
  if (state.request?.budgetMin) iqd.push(state.request.budgetMin);
  const usd = [...prices.map(usdOf), ...state.overBudget.map((c) => usdOf(c.overBy))];
  // Whatever the buyer wrote may be repeated back ("ميزانيتك 20 ألف دولار").
  for (const f of buyerTexts.flatMap(moneyFigures)) (f.currency === "USD" ? usd : iqd).push(f.value);
  return { iqd, usd };
}

function replyProblems(reply: string, allowed: AllowedFigures, state: TurnState): string[] {
  const problems = unsupportedFigures(reply, allowed).map((f) => `"${f}" is not a price from the tools`);
  if (state.overBudget.length && !mentionsOverBudget(reply)) {
    problems.push(
      `it does not say that ${state.overBudget.map((c) => c.id).join(", ")} cost more than the budget ` +
        `(by ${state.overBudget.map((c) => `${c.overBy.toLocaleString("en-US")} د.ع`).join(", ")})`
    );
  }
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
  };
  const messages: LlmMessage[] = [
    // The tools and these instructions are the same for every call: providers
    // that cache (Anthropic and Gemini on this marker, OpenAI, DeepSeek and
    // others on their own) then read them back instead of processing them again.
    // An hour, not the default 5 minutes, so the cache outlives quiet spells.
    {
      role: "system",
      content: [{ type: "text", text: await systemPrompt(db), cache_control: { type: "ephemeral", ttl: "1h" } }],
    },
    ...historyToMessages(history, await arabicNames(db).catch(() => new Map<string, ArabicName>())),
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
    const allowed = allowedFigures(state, [message, ...history.filter((m) => m.role === "user").map((m) => m.content)]);
    const problems = replyProblems(content, allowed, state);
    if (problems.length) {
      state.searches.push({ verify: problems });
      messages.push({ role: "assistant", content });
      messages.push({
        role: "system",
        content:
          `Your reply has problems: ${problems.join(" | ")}. Rewrite it in Iraqi Arabic using only figures from the tool results ` +
          `(prices: ${[...state.seenPrices].map(([id, p]) => `${id} ${p.toLocaleString("en-US")} دينار ≈ ${usdOf(p).toLocaleString("en-US")} دولار`).join("; ")}). ` +
          "Keep the same shape, ending with the suggestions line. No tools.",
      });
      onEvent?.({ type: "status", text: "سديم يراجع الأسعار…" });
      const fixed = cleanReply((await complete(llm, messages, false, turn)).content ?? "");
      if (fixed) {
        const rewritten = splitSuggestions(fixed);
        const left = replyProblems(rewritten.text, allowed, state);
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
