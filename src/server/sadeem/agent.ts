// One Sadeem reply: the LLM (via OpenRouter) reads the conversation, calls the
// catalog tools as often as it needs, then answers. Returns the text plus the
// cars it chose to show, loaded fresh from the database.
import { site } from "@/config/site";
import type { SupabaseEnv } from "@/server/supabase";
import type { Car } from "@/types/car";
import { systemPrompt } from "./prompt";
import { MAX_SHOWN_CARS, TOOL_DEFINITIONS, fetchCars, markShown, runTool, toCar, usdOf, type TurnState } from "./tools";
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

export interface AgentReply {
  content: string;
  cars: Car[];
  quickReplies: string[];
  leadSaved: boolean;
  matchCount?: number;
  searches: Record<string, unknown>[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
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
  baseUrl: string;
}

interface Completion extends LlmMessage {
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
    // Any OpenAI-compatible endpoint works; OpenRouter by default.
    baseUrl: (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  };
}

async function complete(env: OpenRouterEnv, messages: LlmMessage[], allowTools: boolean): Promise<Completion> {
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
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error(`OpenRouter: no message (${JSON.stringify(data).slice(0, 200)})`);
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
function historyToMessages(history: HistoryMessage[]): LlmMessage[] {
  return history.map((m) => {
    if (m.role !== "assistant" || !m.cars?.length) return { role: m.role, content: m.content };
    const count = m.matchCount ? ` | عدد السيارات المطابقة للبحث: ${m.matchCount}` : "";
    return {
      role: m.role,
      content: `${m.content}\n\n[من قاعدة البيانات، السيارات المعروضة: ${m.cars.map((c) => `${c.id} ${c.name}`).join("؛ ")}${count}]`,
    };
  });
}

// Tools whose round usually carries the main answer text (models often write
// the reply next to show_cars and only a closing line after it).
const ANSWER_TOOLS = new Set(["show_cars", "suggest_replies", "save_lead"]);

// Gulf/Levantine words models slip into, with their Iraqi equivalents.
const IRAQI_WORDS = (
  [
    ["تبي|تبغى|تبغي|بدك", "تريد"], ["يبي|يبغى|يبغي|بده", "يريد"], ["الحين|دلوقتي", "هسه"],
    ["وايد", "هواية"], ["كويس|منيح", "زين"],
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

// The model may write the answer next to show_cars and then only a closing
// line, or write the whole answer twice (once per round): keep one full answer.
function joinReply(answerTexts: string[], finalText: string): string {
  if (isFullReply(finalText)) return finalText;
  const full = answerTexts.filter(isFullReply).at(-1);
  return [...new Set([...(full ? [full] : answerTexts), finalText].filter(Boolean))].join("\n\n");
}

/** Cars the tools returned that the reply names (model and year on one line), in reply order. */
function mentionedCars(reply: string, found: TurnState["found"]): string[] {
  const lines = reply.toLowerCase().split("\n");
  return [...found]
    .map(([id, car]) => ({
      id,
      at: lines.findIndex((line) => line.includes(car.model.toLowerCase()) && line.includes(String(car.year))),
    }))
    .filter((car) => car.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((car) => car.id);
}

function allowedFigures(state: TurnState, buyerTexts: string[]): AllowedFigures {
  const prices = [...state.seenPrices.values()];
  const iqd = [...prices, ...state.overBudget.map((c) => c.overBy)];
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
  message: string
): Promise<AgentReply> {
  const state: TurnState = {
    seenIds: new Set(history.flatMap((m) => m.cars?.map((c) => c.id) ?? [])),
    seenPrices: new Map(),
    overBudget: [],
    shownIds: [],
    detailIds: [],
    found: new Map(),
    quickReplies: [],
    leadSaved: false,
    searches: [],
  };
  const messages: LlmMessage[] = [
    { role: "system", content: await systemPrompt(db) },
    ...historyToMessages(history),
    { role: "user", content: message },
  ];

  const answerTexts: string[] = [];
  let finalText = "";
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // The last round may not call tools again: it has to answer.
    const reply = await complete(llm, messages, round < MAX_ROUNDS - 1);
    // Note when OpenRouter answered with the fallback, so chat reviews show it.
    if (llm.fallbackModel && reply.model?.startsWith(llm.fallbackModel) && !state.searches.some((s) => s.fallback)) {
      state.searches.push({ fallback: reply.model });
    }
    const calls = reply.tool_calls ?? [];
    const text = cleanReply(reply.content ?? "");
    if (calls.length === 0) {
      finalText = text;
      break;
    }
    if (text && calls.some((call) => ANSWER_TOOLS.has(call.function.name))) answerTexts.push(text);
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
    content = cleanReply((await complete(llm, messages, false)).content ?? "");
  }

  // Prices of every car this conversation has touched, current from the database.
  const rows = await fetchCars(db, [...state.seenIds]);
  rows.forEach((row) => state.seenPrices.set(row.id, row.price_iqd));
  // Models sometimes list cars without calling show_cars (comparisons, quick
  // answers); show the ones the reply names, else the ones looked up in detail.
  if (!state.shownIds.length) {
    const named = mentionedCars(content, state.found);
    markShown(state, (named.length ? named : state.detailIds).slice(0, MAX_SHOWN_CARS));
  }
  const cars = state.shownIds
    .map((id) => rows.find((row) => row.id === id))
    .filter((row) => row !== undefined)
    .map(toCar);

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
          `(prices: ${[...state.seenPrices].map(([id, p]) => `${id} ${p.toLocaleString("en-US")} د.ع ≈ ${usdOf(p).toLocaleString("en-US")} $`).join("; ")}). No tools.`,
      });
      const fixed = cleanReply((await complete(llm, messages, false)).content ?? "");
      if (fixed) {
        const left = replyProblems(fixed, allowed, state);
        if (left.length) state.searches.push({ verify_after_rewrite: left });
        content = fixed;
      }
    }
  }

  return {
    content: content || (cars.length ? "هاي أقرب السيارات لطلبك 👇" : "ما فهمت طلبك زين، تگدر توضحلي أكثر؟"),
    cars,
    quickReplies: state.quickReplies,
    leadSaved: state.leadSaved,
    matchCount: cars.length ? state.matchCount : undefined,
    searches: state.searches,
  };
}
