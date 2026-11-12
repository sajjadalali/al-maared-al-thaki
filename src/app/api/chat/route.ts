import { after } from "next/server";
import { insert, supabaseEnv, type SupabaseEnv } from "@/server/supabase";
import { getCatalog } from "@/server/catalog";
import { openRouterEnv, runSadeem, type HistoryMessage, type SadeemEvent } from "@/server/sadeem/agent";
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

// The LLM Sadeem when it is configured and works, else the rule-based one.
async function answer(
  message: string,
  history: HistoryMessage[],
  onEvent?: (event: SadeemEvent) => void
): Promise<Reply> {
  const llm = openRouterEnv();
  const db = supabaseEnv();
  try {
    return llm && db ? await runSadeem(llm, db, history, message, onEvent) : await rulesFallback(message, history);
  } catch (err) {
    console.error("[sadeem] LLM failed, answering with the rules:", err);
    const reply = await rulesFallback(message, history);
    // Why, in the stored log too: the container logs are not always at hand.
    const where = err instanceof Error ? (err.stack ?? "").split("\n").slice(1, 3).map((l) => l.trim()).join(" | ") : "";
    const what = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { ...reply, searches: [{ rules: true, error: what.slice(0, 300), at: where.slice(0, 300) }] };
  }
}

// Keeps the conversation for tuning Sadeem.
async function logChat(db: SupabaseEnv, sessionId: string, message: string, reply: Reply) {
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
        // What the buyer saw besides the text, to review the suggestions and buttons too.
        tool_calls: [...reply.searches, { shown: { quick: reply.quickReplies, actions: reply.actions?.map((a) => a.kind) ?? [] } }],
      },
    ]);
  } catch (err) {
    console.error("[sadeem] chat log not saved:", err);
  }
}

// What the browser gets: the reply without the internal search log.
const publicReply = (reply: Reply) => ({
  content: reply.content,
  cars: reply.cars,
  quickReplies: reply.quickReplies,
  matchCount: reply.matchCount,
  criteria: reply.criteria,
  actions: reply.actions,
});

/**
 * POST { message, history, sessionId, stream? } → { content, cars, quickReplies, … }.
 * With stream: true the answer comes as server-sent events while it is made:
 * {type:"status"} while Sadeem searches, {type:"text"} with the reply so far,
 * then {type:"done", …the reply}. The LLM Sadeem answers when OpenRouter and
 * Supabase are configured; the rule-based one when they aren't or the LLM fails.
 */
export async function POST(request: Request) {
  const db = supabaseEnv();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  if (!message) return Response.json({ error: "empty_message" }, { status: 400 });
  const history = parseHistory(body?.history);
  const sessionId = typeof body?.sessionId === "string" && UUID.test(body.sessionId) ? body.sessionId : null;
  const keepLog = sessionId && db?.writeKey ? (reply: Reply) => logChat(db, sessionId, message, reply) : null;

  if (body?.stream !== true) {
    const reply = await answer(message, history);
    if (keepLog) after(() => keepLog(reply));
    return Response.json(publicReply(reply));
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // the visitor closed the chat or the page: finish the reply for the log anyway
        }
      };
      const reply = await answer(message, history, send);
      send({ type: "done", ...publicReply(reply) });
      // The buyer already has the reply; the log is written before the stream closes.
      await keepLog?.(reply);
      try {
        controller.close();
      } catch {
        // already closed by the visitor
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // Traefik (in front of the app on Coolify) compresses responses that
      // have no Content-Encoding yet, and its brotli/zstd encoders hold the
      // events back until the reply is complete, even for text/event-stream.
      // Declaring the encoding ("identity": none) makes it pass them through.
      "Content-Encoding": "identity",
      // no-transform: Next.js compression would otherwise hold the lines back too.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
