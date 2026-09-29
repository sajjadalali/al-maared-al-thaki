import type { Car } from "@/types/car";

export type ChatRole = "user" | "assistant";

export interface ChatAction {
  label: string;
  href: string;
  kind: "whatsapp" | "phone";
}

/** A reply never shows more cars than this; the chat UI enforces it too. */
export const MAX_CHAT_CARS = 3;

export interface ChatMessage {
  id: string;
  role: ChatRole;
  /** Plain text; `**bold**` and lines starting with "- " are rendered. */
  content: string;
  timestamp: string;
  cars?: Car[];
  /** What Sadeem understood from the request, shown as small tags. */
  criteria?: string[];
  quickReplies?: string[];
  actions?: ChatAction[];
}

export interface AIService {
  /** Sends a user message and the recent conversation history, returns Sadeem's reply. */
  sendMessage(message: string, history: ChatMessage[]): Promise<ChatMessage>;
  /** The opening message shown when the chat is first opened. */
  getWelcomeMessage(): ChatMessage;
}
