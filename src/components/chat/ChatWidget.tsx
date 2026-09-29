"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { aiService } from "@/services/ai";
import type { ChatMessage } from "@/services/ai";
import { onSadeemOpen, onSadeemPrompt } from "@/lib/chatBus";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickActions } from "./QuickActions";
import { ChatInput } from "./ChatInput";

const STORAGE_KEY = "autopro:chat-messages";

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "اليوم";
  if (date.toDateString() === yesterday.toDateString()) return "أمس";
  return date.toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long" });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasHydrated = useRef(false);
  // The prompt listener below is registered once, so it reads history from a
  // ref rather than the `messages` it closed over on first render.
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    let initial: ChatMessage[] = [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
    } catch {
      // ignore
    }
    if (initial.length === 0) initial = [aiService.getWelcomeMessage()];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage, unavailable during SSR
    setMessages(initial);
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    if (!hasHydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => onSadeemOpen(() => setOpen(true)), []);
  useEffect(
    () =>
      onSadeemPrompt((message) => {
        setOpen(true);
        void handleSend(message);
      }),
    []
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);

    try {
      const response = await aiService.sendMessage(text, messagesRef.current);
      setMessages((prev) => [...prev, response]);
    } finally {
      setTyping(false);
    }
  }

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-900 py-3 pe-5 ps-3 text-white shadow-xl shadow-brand-950/30 transition hover:bg-brand-800 animate-pop-in"
          aria-label="تحدث مع سديم"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <Bot className="h-5 w-5" />
            <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-900 bg-success" />
          </span>
          <span className="hidden text-sm font-bold sm:inline">تحدث مع سديم</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="محادثة سديم"
          className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white animate-fade-in sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(660px,calc(100dvh-2.5rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-black/5 sm:shadow-2xl sm:shadow-brand-950/25"
        >
          <div className="flex items-center justify-between gap-3 bg-brand-900 px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] text-white">
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
              onClick={() => setOpen(false)}
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
            <QuickActions
              options={lastAssistantMessage.quickReplies}
              onSelect={(value) => void handleSend(value)}
            />
          )}

          <ChatInput onSend={(text) => void handleSend(text)} disabled={typing} />
        </div>
      )}
    </>
  );
}
