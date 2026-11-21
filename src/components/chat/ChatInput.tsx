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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  function send() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    change("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send();
  }

  // Enter sends, as the keyboard's «إرسال» key says; Shift+Enter is a new line.
  // Not while a word is still being composed (some Arabic and predictive keyboards).
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="flex shrink-0 items-end gap-2 border-t border-black/5 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] group-data-[keyboard]/frame:pb-[calc(0.625rem+var(--kb-gap,0px))] transition-[padding] duration-300 ease-sheet motion-reduce:transition-none"
    >
      {/* A textarea, not an input (21 Nov): over a text input in a form,
          Chrome on Android puts its passwords / cards / addresses bar above the
          keyboard, and iOS Safari its AutoFill bar; neither offers them for a
          textarea. One line that grows with the text (up to ~4 lines where the
          browser supports field-sizing). The data-* attributes keep password
          managers (1Password, LastPass, Bitwarden) off it too.
          16px text: smaller fields make iOS Safari zoom the page on focus. */}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => change(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="اكتب رسالتك هنا..."
        aria-label="رسالتك إلى سديم"
        autoComplete="off"
        enterKeyHint="send"
        data-1p-ignore=""
        data-lpignore="true"
        data-bwignore=""
        data-form-type="other"
        className="max-h-28 min-w-0 flex-1 resize-none rounded-[22px] border border-transparent bg-surface px-4 py-2.5 text-base leading-6 outline-none transition [field-sizing:content] placeholder:text-neutral-400 focus:border-brand-200 focus:bg-white"
      />

      <button
        type="submit"
        // The input keeps its focus, so the keyboard stays up after sending,
        // as in a chat app (20 Nov). The click still sends.
        onPointerDown={(e) => e.preventDefault()}
        disabled={!value.trim() || disabled}
        aria-label="إرسال"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-900/30"
      >
        <Send className="h-[18px] w-[18px] -scale-x-100" />
      </button>
    </form>
  );
}
