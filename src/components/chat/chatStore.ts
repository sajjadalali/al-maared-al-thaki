// The visitor's conversations with Sadeem, kept in this browser (localStorage).
// Each conversation's id is also its session id in the chat logs.
import { aiService, type ChatMessage } from "@/services/ai";
import { TEST_SESSION_PREFIX, testMode } from "./testMode";

/** How many conversations a visitor can keep; a new one needs a free slot. */
export const MAX_CHATS = 10;
// Enough context for follow-ups without letting stored history grow forever.
const MAX_STORED_MESSAGES = 60;

const STORE_KEY = "autopro:chats";
// Before conversations could be switched there was one, stored under these.
const OLD_MESSAGES_KEY = "autopro:chat-messages";
const OLD_SESSION_KEY = "autopro:chat-session";

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface ChatStore {
  activeId: string;
  chats: Conversation[];
}

function newId(): string {
  let id: string;
  try {
    id = crypto.randomUUID();
  } catch {
    // crypto.randomUUID needs a secure context; a UUID-shaped id is enough here
    id = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16)
    );
  }
  return testMode() ? TEST_SESSION_PREFIX + id.slice(9) : id;
}

export function newConversation(): Conversation {
  return { id: newId(), messages: [aiService.getWelcomeMessage()], updatedAt: new Date().toISOString() };
}

function read<T>(key: string): T | null {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

export function loadStore(): ChatStore {
  const store = read<ChatStore>(STORE_KEY);
  if (store?.chats?.length && store.chats.some((c) => c.id === store.activeId)) return store;

  // The single conversation from before becomes the first one in the list.
  const oldMessages = read<ChatMessage[]>(OLD_MESSAGES_KEY);
  const first = newConversation();
  if (Array.isArray(oldMessages) && oldMessages.length > 0) {
    let oldId: string | null = null;
    try {
      oldId = window.localStorage.getItem(OLD_SESSION_KEY);
    } catch {
      // blocked storage
    }
    first.id = oldId ?? first.id;
    first.messages = oldMessages;
    first.updatedAt = oldMessages.at(-1)!.timestamp;
  }
  return { activeId: first.id, chats: [first] };
}

// Cars are kept without their long texts: the cards under a reply don't show
// them, and ten conversations of full cars could fill the browser's storage.
function slim(message: ChatMessage): ChatMessage {
  return message.cars ? { ...message, cars: message.cars.map((car) => ({ ...car, description: "", features: [] })) } : message;
}

export function saveStore(store: ChatStore) {
  const chats = store.chats.map((c) => ({ ...c, messages: c.messages.slice(-MAX_STORED_MESSAGES).map(slim) }));
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ ...store, chats }));
    window.localStorage.removeItem(OLD_MESSAGES_KEY);
  } catch {
    // storage full or blocked: the conversations still work for this visit
  }
}

export const hasUserMessages = (chat: Conversation) => chat.messages.some((m) => m.role === "user");

/** What the list calls a conversation: its first question. */
export function conversationTitle(chat: Conversation): string {
  const first = chat.messages.find((m) => m.role === "user")?.content.trim();
  if (!first) return "محادثة جديدة";
  return first.length > 40 ? `${first.slice(0, 40)}…` : first;
}
