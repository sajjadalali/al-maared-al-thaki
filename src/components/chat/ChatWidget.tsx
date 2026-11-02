"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, X } from "lucide-react";
import { onSadeemOpen, onSadeemPrompt } from "@/lib/chatBus";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { cn } from "@/lib/cn";
import { CHAT_FRAME_CLASS, CHAT_HEADER_CLASS } from "./chatFrame";
import type { ChatPrompt } from "./ChatPanel";

// The panel carries the conversation UI. Every page only ships this small
// launcher; the panel loads when the chat is about to open (hover, focus or
// touch on the button) or when it's opened.
const loadPanel = () => import("./ChatPanel");

function PanelLoading() {
  return (
    <div role="dialog" aria-label="محادثة سديم" aria-busy className={CHAT_FRAME_CLASS}>
      <div className={CHAT_HEADER_CLASS}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
            <Bot className="h-5 w-5" />
          </span>
          <p className="text-base font-bold">سديم</p>
        </div>
        <X className="h-5 w-5 text-white/40" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#f2f5f9]">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    </div>
  );
}

const ChatPanel = dynamic(loadPanel, { ssr: false, loading: PanelLoading });

// How long the button says "رجوع للمحادثة" after the chat got out of the way.
const RESUME_HINT_MS = 6000;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  // The panel mounts on first open and then stays mounted (hidden when
  // minimised), so the conversation and any reply on its way survive.
  const [started, setStarted] = useState(false);
  const [resumeHint, setResumeHint] = useState(false);
  const [unread, setUnread] = useState(false);
  const [prompt, setPrompt] = useState<ChatPrompt | null>(null);

  const openChat = useCallback(() => {
    setOpen(true);
    setStarted(true);
    setUnread(false);
    setResumeHint(false);
  }, []);

  const minimize = useCallback(() => {
    setOpen(false);
    setResumeHint(true);
  }, []);

  // Any navigation (a car card in the chat, the header, the back button)
  // minimises the chat, so the page the buyer went to is what they see.
  const pathname = usePathname();
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    if (open) minimize();
  }

  useEffect(() => {
    if (!resumeHint) return;
    const timer = setTimeout(() => setResumeHint(false), RESUME_HINT_MS);
    return () => clearTimeout(timer);
  }, [resumeHint]);

  useEffect(() => onSadeemOpen(openChat), [openChat]);
  useEffect(
    () =>
      onSadeemPrompt((text) => {
        setPrompt({ id: Date.now(), text });
        openChat();
      }),
    [openChat]
  );

  const clearPrompt = useCallback(() => setPrompt(null), []);
  const handleReply = useCallback(() => {
    if (!open) setUnread(true);
  }, [open]);
  const warmUp = () => void loadPanel();

  const label = unread ? "سديم رد عليك" : resumeHint ? "رجوع للمحادثة" : started ? "كمّل مع سديم" : "تحدث مع سديم";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openChat}
          onPointerEnter={warmUp}
          onTouchStart={warmUp}
          onFocus={warmUp}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-950 py-2.5 pe-5 ps-2.5 text-white shadow-xl shadow-brand-950/30 ring-1 ring-white/10 transition hover:bg-brand-800 animate-pop-in max-lg:[body:has([data-contact-bar])_&]:bottom-24"
          aria-label={label}
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <SadeemMascot className="h-8 w-8" />
            <span
              className={cn(
                "absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-950",
                unread ? "bg-accent-500 animate-pulse" : "bg-success"
              )}
            />
          </span>
          {/* On phones the button is just Sadeem's face, except right after the chat stepped aside. */}
          <span className={cn("text-sm font-bold", unread || resumeHint ? "inline" : "hidden sm:inline")}>{label}</span>
        </button>
      )}

      {started && (
        <ChatPanel
          hidden={!open}
          onClose={() => setOpen(false)}
          onNavigate={minimize}
          onReply={handleReply}
          prompt={prompt}
          onPromptHandled={clearPrompt}
        />
      )}
    </>
  );
}
