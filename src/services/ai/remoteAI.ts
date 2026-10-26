import { phoneHref, whatsappHref } from "@/config/site";
import { carWhatsappMessage } from "@/lib/carMessages";
import { formatIQD } from "@/lib/format";
import type { Car } from "@/types/car";
import { mockAIService } from "./mockAI";
import { MAX_CHAT_CARS, type AIService, type ChatMessage } from "./types";

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

function contactActions(car: Car): ChatMessage["actions"] {
  return [
    { label: "استفسر على واتساب", href: whatsappHref(carWhatsappMessage(car)), kind: "whatsapp" },
    { label: "اتصل بنا", href: phoneHref, kind: "phone" },
  ];
}

/**
 * Sadeem backed by the LLM route (/api/chat: OpenRouter + Supabase). When the
 * route isn't configured, is rate limited or fails, the rule-based Sadeem
 * answers instead, so the chat never goes silent.
 */
export const remoteAIService: AIService = {
  getWelcomeMessage: () => mockAIService.getWelcomeMessage(),

  async sendMessage(message, history) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: toHistory(history), sessionId: sessionId() }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: { content: string; cars?: Car[]; quickReplies?: string[]; matchCount?: number } = await res.json();
      const cars = (data.cars ?? []).slice(0, MAX_CHAT_CARS);
      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
        cars: cars.length ? cars : undefined,
        matchCount: data.matchCount,
        quickReplies: data.quickReplies?.length ? data.quickReplies : undefined,
        actions: cars.length === 1 ? contactActions(cars[0]) : undefined,
      };
    } catch {
      return mockAIService.sendMessage(message, history);
    }
  },
};
