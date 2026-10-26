import { remoteAIService } from "./remoteAI";
import type { AIService } from "./types";

/**
 * Swappable AI service entry point.
 *
 * The chat UI only ever talks to `aiService`. It is the LLM-backed Sadeem
 * (remoteAI.ts → /api/chat), which falls back to the rule-based one in
 * mockAI.ts whenever the API isn't configured or fails.
 */
export const aiService: AIService = remoteAIService;

export type { AIService, ChatAction, ChatMessage, ChatRole } from "./types";
export { MAX_CHAT_CARS } from "./types";
