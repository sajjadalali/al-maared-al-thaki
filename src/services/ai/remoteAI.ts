import { phoneHref, whatsappHref } from "@/config/site";
import { carWhatsappMessage } from "@/lib/carMessages";
import { formatIQD } from "@/lib/format";
import type { Car } from "@/types/car";
import { MAX_CHAT_CARS, type AIService, type ChatAction, type ChatMessage, type ReplyProgress } from "./types";
import { offlineMessage, welcomeMessage } from "./welcome";

const SESSION_KEY = "autopro:chat-session";
const TIMEOUT_MS = 60_000;

function sessionId(): string | undefined {
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

// What the server needs from earlier messages: the text, which cars were shown
// (with their prices) and how many matched, so "الثانية", "قارنهم" or "الأسعار
// غلط" can be answered from facts instead of memory.
function toHistory(history: ChatMessage[]) {
  return history.slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
    cars: m.cars?.map((car) => ({ id: car.id, name: `${car.brand} ${car.model} ${car.year} – ${formatIQD(car.price)}` })),
    matchCount: m.matchCount,
  }));
}

interface ReplyData {
  content: string;
  cars?: Car[];
  quickReplies?: string[];
  matchCount?: number;
  criteria?: string[];
  actions?: ChatAction[];
}

// The route answers in server-sent events ("data: {…}"): {type:"status"} and
// {type:"text"} while the reply is made, then {type:"done", …the reply}.
async function readReply(res: Response, onProgress?: (progress: ReplyProgress) => void): Promise<ReplyData> {
  if (!res.body || !res.headers.get("content-type")?.includes("event-stream")) return res.json();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const event = JSON.parse(line.slice(5));
      if (event.type === "done") return event as ReplyData;
      if (event.type === "status") onProgress?.({ status: event.text });
      if (event.type === "text") onProgress?.({ text: event.text });
    }
    if (done) throw new Error("stream ended without a reply");
  }
}

function contactActions(car: Car): ChatMessage["actions"] {
  return [
    { label: "استفسر على واتساب", href: whatsappHref(carWhatsappMessage(car)), kind: "whatsapp" },
    { label: "اتصل بنا", href: phoneHref, kind: "phone" },
  ];
}

/**
 * Sadeem through /api/chat, which answers with the LLM (OpenRouter +
 * Supabase) or, when that isn't available, with the rule-based Sadeem. If the
 * route can't be reached, the buyer gets WhatsApp and call buttons instead.
 */
export const remoteAIService: AIService = {
  getWelcomeMessage: welcomeMessage,

  async sendMessage(message, history, onProgress) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: toHistory(history), sessionId: sessionId(), stream: true }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 429) return offlineMessage(true);
      if (!res.ok) throw new Error(String(res.status));
      const data = await readReply(res, onProgress);
      const cars = (data.cars ?? []).slice(0, MAX_CHAT_CARS);
      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
        cars: cars.length ? cars : undefined,
        matchCount: data.matchCount,
        criteria: data.criteria?.length ? data.criteria : undefined,
        quickReplies: data.quickReplies?.length ? data.quickReplies : undefined,
        actions: data.actions?.length ? data.actions : cars.length === 1 ? contactActions(cars[0]) : undefined,
      };
    } catch {
      return offlineMessage();
    }
  },
};
