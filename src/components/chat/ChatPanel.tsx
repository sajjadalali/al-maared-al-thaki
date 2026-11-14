"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { History, SquarePen, Sparkles, Trash2, X } from "lucide-react";
import { aiService, type ChatMessage, type ReplyProgress } from "@/services/ai";
import { cn } from "@/lib/cn";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickActions } from "./QuickActions";
import { ChatInput } from "./ChatInput";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { CHAT_AVATAR_CLASS, CHAT_FRAME_CLASS, CHAT_HEADER_CLASS, chatFrameMotion } from "./chatFrame";
import {
  MAX_CHATS,
  conversationTitle,
  hasUserMessages,
  loadStore,
  newConversation,
  saveStore,
  type ChatStore,
  type Conversation,
} from "./chatStore";

export interface ChatPrompt {
  id: number;
  text: string;
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

const timeLabel = (iso: string) =>
  `${dayLabel(iso)} ${new Date(iso).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "numeric", minute: "2-digit" })}`;

function countMessages(n: number): string {
  if (n === 0) return "بدون رسائل";
  if (n === 1) return "رسالة وحدة";
  if (n === 2) return "رسالتين";
  return n <= 10 ? `${n} رسائل` : `${n} رسالة`;
}

const headerButton =
  "flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white";

// Loaded on demand by ChatWidget (client-only), so reading localStorage while
// initialising state is safe here. Once opened it stays mounted and is only
// hidden while minimised, so a reply still on its way isn't lost.
export default function ChatPanel({
  phase,
  openedAt,
  navigating,
  onExited,
  onClose,
  onNavigate,
  onReply,
  prompt,
  onPromptHandled,
}: {
  /** open; leaving (sliding away, then hidden); closed (hidden, still mounted). */
  phase: "open" | "leaving" | "closed";
  /** performance.now() when the chat started opening. */
  openedAt: number;
  /** A car card was tapped and its page is on the way. */
  navigating: boolean;
  /** The slide-away animation finished. */
  onExited: () => void;
  onClose: () => void;
  /** A link in the chat (a car card) was followed: the chat steps aside once the page is there. */
  onNavigate: () => void;
  /** Sadeem answered (the widget flags it when the chat is minimised). */
  onReply: () => void;
  prompt: ChatPrompt | null;
  onPromptHandled: () => void;
}) {
  const [store, setStore] = useState<ChatStore>(loadStore);
  const [view, setView] = useState<"chat" | "list">("chat");
  // The reply on its way: which conversation it belongs to, and what Sadeem
  // has written so far (a status first, then the text).
  const [pending, setPending] = useState<{ chatId: string; draft: ReplyProgress } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const storeRef = useRef(store);
  const onReplyRef = useRef(onReply);

  const hidden = phase === "closed";
  // Mounted while already opening (a tap before the panel had loaded): the
  // placeholder has been growing since openedAt, so this entrance starts that
  // far in and the two read as one movement. Measured just before the first
  // paint, which is when this frame's animation actually starts.
  const frameRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(openedAt);
  const mountedOpen = useRef(phase === "open");
  useLayoutEffect(() => {
    if (!mountedOpen.current || !frameRef.current) return;
    frameRef.current.style.animationDelay = `-${Math.round(performance.now() - openedAtRef.current)}ms`;
  }, []);
  useEffect(() => {
    // Any later entrance or exit starts from its beginning.
    if (phase !== "open" && frameRef.current) frameRef.current.style.animationDelay = "";
  }, [phase]);
  const active = store.chats.find((c) => c.id === store.activeId) ?? store.chats[0];
  const messages = active.messages;
  const typing = pending?.chatId === active.id;
  const draft = typing ? pending.draft : {};

  useEffect(() => {
    onReplyRef.current = onReply;
  }, [onReply]);

  useEffect(() => {
    storeRef.current = store;
    saveStore(store);
  }, [store]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, draft.text]);

  // Back from a car page, or from the list: open at the latest message.
  useEffect(() => {
    if (!hidden && view === "chat") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [hidden, view, store.activeId]);

  const updateChat = useCallback((id: string, change: (chat: Conversation) => Conversation) => {
    setStore((prev) => ({ ...prev, chats: prev.chats.map((c) => (c.id === id ? change(c) : c)) }));
  }, []);

  const addMessage = useCallback(
    (id: string, message: ChatMessage) =>
      updateChat(id, (c) => ({ ...c, messages: [...c.messages, message], updatedAt: message.timestamp })),
    [updateChat]
  );

  const handleSend = useCallback(
    async (text: string) => {
      const chat = storeRef.current.chats.find((c) => c.id === storeRef.current.activeId);
      if (!chat) return;
      const history = chat.messages;
      addMessage(chat.id, { id: `user-${Date.now()}`, role: "user", content: text, timestamp: new Date().toISOString() });
      setPending({ chatId: chat.id, draft: {} });
      try {
        // The reply goes to the conversation it was asked in, even if the
        // visitor has moved to another one meanwhile.
        const response = await aiService.sendMessage(
          text,
          history,
          (progress) => setPending((prev) => (prev?.chatId === chat.id ? { ...prev, draft: { ...prev.draft, ...progress } } : prev)),
          chat.id
        );
        addMessage(chat.id, response);
        onReplyRef.current();
      } finally {
        setPending(null);
      }
    },
    [addMessage]
  );

  const atLimit = store.chats.length >= MAX_CHATS;

  // A new conversation, unless the current one is still empty (then it is the new one).
  const startNew = () => {
    if (!hasUserMessages(active)) return setView("chat");
    if (atLimit) return setView("list");
    const chat = newConversation();
    setStore((prev) => ({ activeId: chat.id, chats: [chat, ...prev.chats] }));
    setView("chat");
  };

  const open = (id: string) => {
    setStore((prev) => ({ ...prev, activeId: id }));
    setView("chat");
  };

  const remove = (id: string) => {
    if (!window.confirm("تحذف هذي المحادثة؟")) return;
    setStore((prev) => {
      const chats = prev.chats.filter((c) => c.id !== id);
      if (chats.length === 0) {
        const chat = newConversation();
        return { activeId: chat.id, chats: [chat] };
      }
      return { activeId: prev.activeId === id ? chats[0].id : prev.activeId, chats };
    });
  };

  // A message sent from elsewhere on the page ("اسأل سديم عن هذه السيارة").
  useEffect(() => {
    if (!prompt) return;
    onPromptHandled();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hands a message from outside the panel (another page element) into the conversation
    setView("chat");
    void handleSend(prompt.text);
  }, [prompt, onPromptHandled, handleSend]);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const sorted = [...store.chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div
      role="dialog"
      aria-label="محادثة سديم"
      // Invisible and inert rather than display:none, so the messages' entrance
      // animations don't all replay each time the chat comes back.
      inert={hidden}
      aria-hidden={hidden || undefined}
      data-sadeem-chat
      className={cn(CHAT_FRAME_CLASS, chatFrameMotion(phase !== "open"), hidden && "invisible")}
      ref={frameRef}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && phase === "leaving") onExited();
      }}
      onClickCapture={(e) => {
        // Any link to a page of the site (car cards, links in a reply), not WhatsApp or phone.
        const link = (e.target as Element).closest("a");
        if (link && link.origin === window.location.origin) onNavigate();
      }}
    >
      <div className={CHAT_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-3">
          <span data-sadeem-avatar className={cn(CHAT_AVATAR_CLASS, "ring-2 ring-white/10")}>
            <SadeemMascot className="h-9 w-9" />
            <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-950 bg-success" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-bold leading-6">
              سديم
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </p>
            <p className="truncate text-[12px] leading-5 text-white/70">
              متصل الآن<span className="max-[359px]:hidden"> · موظف المبيعات</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setView(view === "list" ? "chat" : "list")}
            aria-label="محادثاتك"
            aria-pressed={view === "list"}
            className={cn(headerButton, view === "list" && "bg-white/15 text-white")}
          >
            <History className="h-5 w-5" />
          </button>
          <button type="button" onClick={startNew} aria-label="محادثة جديدة" className={headerButton}>
            <SquarePen className="h-5 w-5" />
          </button>
          <button type="button" onClick={onClose} aria-label="إغلاق المحادثة" className={headerButton}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {navigating && (
          // The car page is loading; the chat slides away when it's there.
          <span role="progressbar" aria-label="فتح صفحة السيارة" className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
            <span className="absolute inset-y-0 right-0 w-2/5 rounded-full bg-accent-400 animate-loading-bar" />
          </span>
        )}
      </div>

      {view === "list" ? (
        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f2f5f9] px-3.5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-brand-950">
              محادثاتك <span className="font-normal text-neutral-500">({store.chats.length} من {MAX_CHATS})</span>
            </p>
            <button
              type="button"
              onClick={startNew}
              disabled={atLimit && hasUserMessages(active)}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-brand-900 px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SquarePen className="h-4 w-4" />
              محادثة جديدة
            </button>
          </div>
          {atLimit && (
            <p className="mb-3 rounded-xl bg-accent-100 px-3 py-2 text-[13px] leading-6 text-accent-700">
              وصلت للحد ({MAX_CHATS} محادثات). احذف وحدة حتى تگدر تبدي محادثة جديدة.
            </p>
          )}
          <ul className="space-y-2">
            {sorted.map((chat) => (
              <li
                key={chat.id}
                className={cn(
                  "flex items-center gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-black/[0.05]",
                  chat.id === active.id && "ring-2 ring-brand-300"
                )}
              >
                <button type="button" onClick={() => open(chat.id)} className="min-w-0 flex-1 px-2.5 py-1.5 text-start">
                  <span className="block truncate text-[14px] font-semibold text-brand-950">{conversationTitle(chat)}</span>
                  <span className="mt-0.5 block text-[11.5px] text-neutral-500">
                    {timeLabel(chat.updatedAt)} · {countMessages(chat.messages.filter((m) => m.role === "user").length)}
                    {pending?.chatId === chat.id && " · سديم يكتب…"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(chat.id)}
                  aria-label={`حذف المحادثة: ${conversationTitle(chat)}`}
                  className="tap-target relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
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
            {typing &&
              (draft.text ? (
                // The cards and suggestions come with the finished reply.
                <ChatMessageBubble
                  message={{ id: "draft", role: "assistant", content: draft.text, timestamp: messages.at(-1)!.timestamp }}
                />
              ) : (
                <TypingIndicator label={draft.status} />
              ))}
          </div>

          {!typing && lastAssistantMessage?.quickReplies && (
            <QuickActions options={lastAssistantMessage.quickReplies} onSelect={(value) => void handleSend(value)} />
          )}

          {/* One reply at a time, whichever conversation it is for. */}
          <ChatInput onSend={(text) => void handleSend(text)} disabled={pending !== null} />
        </>
      )}
    </div>
  );
}
