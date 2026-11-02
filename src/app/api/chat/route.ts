import { after } from "next/server";
import { insert, supabaseEnv } from "@/server/supabase";
import { getCatalog } from "@/server/catalog";
import { openRouterEnv, runSadeem, type HistoryMessage } from "@/server/sadeem/agent";
import { rulesReply } from "@/server/sadeem/rules";
import type { ChatAction } from "@/services/ai/types";
import type { Car } from "@/types/car";

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 12;

// A small per-visitor limit so the LLM bill can't be run up by one client.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function parseHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 1500),
      cars: Array.isArray(m.cars)
        ? m.cars
            .filter((c: { id?: unknown; name?: unknown }) => typeof c?.id === "string" && typeof c?.name === "string")
            .slice(0, 3)
        : undefined,
      matchCount: typeof m.matchCount === "number" ? m.matchCount : undefined,
    }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Reply {
  content: string;
  cars: Car[];
  quickReplies: string[];
  matchCount?: number;
  criteria?: string[];
  actions?: ChatAction[];
  searches: Record<string, unknown>[];
}

// The keyword-rules Sadeem, over the same catalog the pages show.
async function rulesFallback(message: string, history: HistoryMessage[]): Promise<Reply> {
  const reply = rulesReply(await getCatalog(), message, history);
  return {
    content: reply.content,
    cars: reply.cars ?? [],
    quickReplies: reply.quickReplies ?? [],
    criteria: reply.criteria,
    actions: reply.actions,
    searches: [{ rules: true }],
  };
}

/**
 * POST { message, history, sessionId } → { content, cars, quickReplies, … }.
 * The LLM Sadeem answers when OpenRouter and Supabase are configured; the
 * rule-based one answers when they aren't or the LLM fails.
 */
export async function POST(request: Request) {
  const llm = openRouterEnv();
  const db = supabaseEnv();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  if (!message) return Response.json({ error: "empty_message" }, { status: 400 });
  const history = parseHistory(body?.history);
  const sessionId = typeof body?.sessionId === "string" && UUID.test(body.sessionId) ? body.sessionId : null;

  let reply: Reply;
  try {
    reply = llm && db ? await runSadeem(llm, db, history, message) : await rulesFallback(message, history);
  } catch (err) {
    console.error("[sadeem] LLM failed, answering with the rules:", err);
    reply = await rulesFallback(message, history);
  }

  // Keep the conversation for tuning Sadeem, after the reply is sent.
  if (sessionId && db?.writeKey) {
    after(async () => {
      try {
        await insert(db, "chat_sessions", { id: sessionId }, true);
        // A bulk insert needs the same keys on every row, or PostgREST answers 400.
        await insert(db, "chat_messages", [
          { session_id: sessionId, role: "user", content: message, car_ids: [], tool_calls: null },
          {
            session_id: sessionId,
            role: "assistant",
            content: reply.content,
            car_ids: reply.cars.map((c) => c.id),
            tool_calls: reply.searches.length ? reply.searches : null,
          },
        ]);
      } catch (err) {
        console.error("[sadeem] chat log not saved:", err);
      }
    });
  }

  return Response.json({
    content: reply.content,
    cars: reply.cars,
    quickReplies: reply.quickReplies,
    matchCount: reply.matchCount,
    criteria: reply.criteria,
    actions: reply.actions,
  });
}
