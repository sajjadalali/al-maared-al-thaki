import { remoteAIService } from "./remoteAI";
import type { AIService } from "./types";

/**
 * Swappable AI service entry point.
 *
 * The chat UI only ever talks to `aiService`: remoteAI.ts → /api/chat, where
 * the LLM Sadeem answers, or the rule-based one (src/server/sadeem/rules.ts)
 * when the LLM isn't configured or fails.
 */
export const aiService: AIService = remoteAIService;

export type { AIService, ChatAction, ChatMessage, ChatRole } from "./types";
export { MAX_CHAT_CARS } from "./types";
