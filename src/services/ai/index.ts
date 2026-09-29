import { mockAIService } from "./mockAI";
import type { AIService } from "./types";

/**
 * Swappable AI service entry point.
 *
 * The chat UI only ever talks to `aiService`, never to `mockAIService` directly.
 * To connect a real LLM/backend later, implement `AIService` (see ./types.ts) in a
 * new module — e.g. `realAI.ts` calling your own API route — and swap the export
 * below. No component in `components/chat` needs to change.
 */
export const aiService: AIService = mockAIService;

export type { AIService, ChatAction, ChatMessage, ChatRole } from "./types";
export { MAX_CHAT_CARS } from "./types";
