"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, X } from "lucide-react";
import { onSadeemOpen, onSadeemPrompt } from "@/lib/chatBus";
import { CHAT_FRAME_CLASS, CHAT_HEADER_CLASS } from "./chatFrame";
import type { ChatPrompt } from "./ChatPanel";

// The panel carries Sadeem's logic, the car catalog and the message UI. Every
// page only ships this small launcher; the panel loads when the chat is about
// to open (hover, focus or touch on the button) or when it's opened.
const loadPanel = () => import("./ChatPanel");

function PanelLoading() {
  return (
    <div role="dialog" aria-label="محادثة سديم" aria-busy className={CHAT_FRAME_CLASS}>
      <div className={CHAT_HEADER_CLASS}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
            <Bot className="h-5 w-5" />
          </span>
          <p className="text-base font-extrabold">سديم</p>
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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<ChatPrompt | null>(null);

  useEffect(() => onSadeemOpen(() => setOpen(true)), []);
  useEffect(
    () =>
      onSadeemPrompt((text) => {
        setPrompt({ id: Date.now(), text });
        setOpen(true);
      }),
    []
  );

  const clearPrompt = useCallback(() => setPrompt(null), []);
  const warmUp = () => void loadPanel();

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onPointerEnter={warmUp}
          onTouchStart={warmUp}
          onFocus={warmUp}
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

      {open && <ChatPanel onClose={() => setOpen(false)} prompt={prompt} onPromptHandled={clearPrompt} />}
    </>
  );
}
