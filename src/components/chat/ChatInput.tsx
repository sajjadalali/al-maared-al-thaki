"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { onSadeemWrite, takeWriteRequest } from "@/lib/chatBus";

export function ChatInput({
  onSend,
  disabled,
  onTyping,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  /** Whether there is text in the box (the suggestions step aside while the buyer writes their own). */
  onTyping?: (typing: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Opened to write in (the demo's message box): the box takes the focus, after
  // the chat's opening animation so the page doesn't jump.
  useEffect(() => {
    const focusSoon = () => {
      if (!takeWriteRequest()) return;
      window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 320);
    };
    focusSoon();
    return onSadeemWrite(focusSoon);
  }, []);
  const change = (next: string) => {
    setValue(next);
    onTyping?.(next.trim().length > 0);
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    change("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] group-data-[keyboard]/frame:pb-2.5"
    >
      {/* 16px text: smaller inputs make iOS Safari zoom the page on focus. */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => change(e.target.value)}
        placeholder="اكتب رسالتك هنا..."
        aria-label="رسالتك إلى سديم"
        autoComplete="off"
        enterKeyHint="send"
        className="min-w-0 flex-1 rounded-full border border-transparent bg-surface px-4 py-2.5 text-base outline-none transition placeholder:text-neutral-400 focus:border-brand-200 focus:bg-white"
      />

      <button
        type="submit"
        disabled={!value.trim() || disabled}
        aria-label="إرسال"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-900/30"
      >
        <Send className="h-[18px] w-[18px] -scale-x-100" />
      </button>
    </form>
  );
}
