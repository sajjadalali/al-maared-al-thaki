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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasHydrated = useRef(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await aiService.sendMessage(text, messages);
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
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] w-full flex-col overflow-hidden bg-white shadow-2xl animate-fade-in sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-96 sm:rounded-2xl sm:border sm:border-black/5">
          <div className="flex items-center justify-between gap-3 bg-brand-900 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" />
                <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-900 bg-success" />
              </span>
              <div>
                <p className="flex items-center gap-1 text-sm font-extrabold">
                  سديم
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                </p>
                <p className="flex items-center gap-1 text-[11px] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  متصل الآن — مساعد المبيعات الذكي
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق المحادثة"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-white px-4 py-4">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
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
