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
  /** How many cars matched the search behind this reply (more than the ones shown). */
  matchCount?: number;
  /** What Sadeem understood from the request, shown as small tags. */
  criteria?: string[];
  quickReplies?: string[];
  actions?: ChatAction[];
}

/** The reply while it is being made: what Sadeem is doing, then the text so far. */
export interface ReplyProgress {
  status?: string;
  text?: string;
}

export interface AIService {
  /**
   * Sends a user message and the recent conversation history, returns Sadeem's
   * reply. onProgress gets the reply as it is written, before it resolves;
   * conversationId keeps each conversation apart in the chat logs.
   */
  sendMessage(
    message: string,
    history: ChatMessage[],
    onProgress?: (progress: ReplyProgress) => void,
    conversationId?: string
  ): Promise<ChatMessage>;
  /** The opening message shown when the chat is first opened. */
  getWelcomeMessage(): ChatMessage;
}
