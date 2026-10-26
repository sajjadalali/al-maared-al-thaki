import { after } from "next/server";
import { insert, supabaseEnv } from "@/server/supabase";
import { openRouterEnv, runSadeem, type HistoryMessage } from "@/server/sadeem/agent";

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

/**
 * POST { message, history, sessionId } → { content, cars, quickReplies }.
 * 503 when OpenRouter or Supabase isn't configured: the chat then falls back
 * to the built-in rule-based Sadeem.
 */
export async function POST(request: Request) {
  const llm = openRouterEnv();
  const db = supabaseEnv();
  if (!llm || !db) return Response.json({ error: "not_configured" }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  if (!message) return Response.json({ error: "empty_message" }, { status: 400 });
  const history = parseHistory(body?.history);
  const sessionId = typeof body?.sessionId === "string" && UUID.test(body.sessionId) ? body.sessionId : null;

  try {
    const reply = await runSadeem(llm, db, history, message);

    // Keep the conversation for tuning Sadeem, after the reply is sent.
    if (sessionId && db.writeKey) {
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
    });
  } catch (err) {
    console.error("[sadeem]", err);
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }
}
