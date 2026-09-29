import type { Car } from "@/types/car";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  cars?: Car[];
  quickReplies?: string[];
}

export interface AIService {
  /** Sends a user message and the recent conversation history, returns Sadeem's reply. */
  sendMessage(message: string, history: ChatMessage[]): Promise<ChatMessage>;
  /** The opening message shown when the chat is first opened. */
  getWelcomeMessage(): ChatMessage;
}
