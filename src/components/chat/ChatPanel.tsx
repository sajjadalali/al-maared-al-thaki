"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { aiService, type ChatMessage } from "@/services/ai";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickActions } from "./QuickActions";
import { ChatInput } from "./ChatInput";
import { CHAT_FRAME_CLASS, CHAT_HEADER_CLASS } from "./chatFrame";

const STORAGE_KEY = "autopro:chat-messages";
// Enough context for follow-ups without letting stored history grow forever.
const MAX_STORED_MESSAGES = 60;

export interface ChatPrompt {
  id: number;
  text: string;
}

function loadMessages(): ChatMessage[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChatMessage[];
  } catch {
    // unreadable or blocked storage: start a fresh conversation
  }
  return [aiService.getWelcomeMessage()];
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "اليوم";
  if (date.toDateString() === yesterday.toDateString()) return "أمس";
  return date.toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long" });
}

// Loaded on demand by ChatWidget (client-only), so reading localStorage while
// initialising state is safe here.
export default function ChatPanel({
  onClose,
  prompt,
  onPromptHandled,
}: {
  onClose: () => void;
  prompt: ChatPrompt | null;
  onPromptHandled: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      // storage full or blocked: the conversation still works for this visit
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = useCallback(async (text: string) => {
    const history = messagesRef.current;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);
    try {
      const response = await aiService.sendMessage(text, history);
      setMessages((prev) => [...prev, response]);
    } finally {
      setTyping(false);
    }
  }, []);

  // A message sent from elsewhere on the page ("اسأل سديم عن هذه السيارة").
  useEffect(() => {
    if (!prompt) return;
    onPromptHandled();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hands a message from outside the panel (another page element) into the conversation
    void handleSend(prompt.text);
  }, [prompt, onPromptHandled, handleSend]);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div role="dialog" aria-label="محادثة سديم" className={CHAT_FRAME_CLASS}>
      <div className={CHAT_HEADER_CLASS}>
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/10">
            <Bot className="h-5 w-5" />
            <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-900 bg-success" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-base font-extrabold leading-6">
              سديم
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </p>
            <p className="text-[12px] leading-5 text-white/70">متصل الآن · مساعد المبيعات الذكي</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق المحادثة"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain bg-[#f2f5f9] px-3.5 py-4">
        {messages.map((message, i) => {
          const day = dayLabel(message.timestamp);
          const showDay = i === 0 || dayLabel(messages[i - 1].timestamp) !== day;
          return (
            <div key={message.id} className="space-y-3.5">
              {showDay && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-neutral-500 shadow-sm">
                    {day}
                  </span>
                </div>
              )}
              <ChatMessageBubble message={message} />
            </div>
          );
        })}
        {typing && <TypingIndicator />}
      </div>

      {!typing && lastAssistantMessage?.quickReplies && (
        <QuickActions options={lastAssistantMessage.quickReplies} onSelect={(value) => void handleSend(value)} />
      )}

      <ChatInput onSend={(text) => void handleSend(text)} disabled={typing} />
    </div>
  );
}
