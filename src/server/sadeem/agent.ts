// One Sadeem reply: the LLM (via OpenRouter) reads the conversation, calls the
// catalog tools as often as it needs, then answers. Returns the text plus the
// cars it chose to show, loaded fresh from the database.
import { site } from "@/config/site";
import type { SupabaseEnv } from "@/server/supabase";
import type { Car } from "@/types/car";
import { systemPrompt } from "./prompt";
import { TOOL_DEFINITIONS, fetchCars, runTool, toCar, type TurnState } from "./tools";

// Fast and cheap with reliable tool calls; set OPENROUTER_MODEL for something else.
export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";
const MAX_ROUNDS = 6;

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  /** Cars shown with an assistant reply, so "الثانية" can be resolved. */
  cars?: { id: string; name: string }[];
}

export interface AgentReply {
  content: string;
  cars: Car[];
  quickReplies: string[];
  leadSaved: boolean;
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
  baseUrl: string;
}

export function openRouterEnv(): OpenRouterEnv | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    // Any OpenAI-compatible endpoint works; OpenRouter by default.
    baseUrl: (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  };
}

async function complete(env: OpenRouterEnv, messages: LlmMessage[], allowTools: boolean): Promise<LlmMessage> {
  const res = await fetch(`${env.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": site.url,
      "X-Title": "Al Maared Al Thaki",
    },
    body: JSON.stringify({
      model: env.model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: allowTools ? "auto" : "none",
      temperature: 0.3,
      max_tokens: 900,
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
  };
}

function historyToMessages(history: HistoryMessage[]): LlmMessage[] {
  return history.map((m) => ({
    role: m.role,
    content:
      m.role === "assistant" && m.cars?.length
        ? `${m.content}\n\n[السيارات المعروضة: ${m.cars.map((c) => `${c.id} ${c.name}`).join("، ")}]`
        : m.content,
  }));
}

export async function runSadeem(
  llm: OpenRouterEnv,
  db: SupabaseEnv,
  history: HistoryMessage[],
  message: string
): Promise<AgentReply> {
  const state: TurnState = {
    seenIds: new Set(history.flatMap((m) => m.cars?.map((c) => c.id) ?? [])),
    shownIds: [],
    quickReplies: [],
    leadSaved: false,
    searches: [],
  };
  const messages: LlmMessage[] = [
    { role: "system", content: await systemPrompt(db) },
    ...historyToMessages(history),
    { role: "user", content: message },
  ];

  let content = "";
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // The last round may not call tools again: it has to answer.
    const reply = await complete(llm, messages, round < MAX_ROUNDS - 1);
    const calls = reply.tool_calls ?? [];
    if (calls.length === 0) {
      content = reply.content?.trim() ?? "";
      break;
    }
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

  const rows = await fetchCars(db, state.shownIds);
  const cars = state.shownIds
    .map((id) => rows.find((row) => row.id === id))
    .filter((row) => row !== undefined)
    .map(toCar);

  return {
    content: content || "تدلل، شنو تحب أساعدك بيه؟",
    cars,
    quickReplies: state.quickReplies,
    leadSaved: state.leadSaved,
    searches: state.searches,
  };
}
