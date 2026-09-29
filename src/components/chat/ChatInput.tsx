"use client";

import { useState } from "react";
import { Paperclip, Smile, Send } from "lucide-react";

export function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 border-t border-black/5 bg-white px-3 py-2.5"
    >
      <button
        type="button"
        tabIndex={-1}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-surface hover:text-neutral-600"
        aria-hidden
      >
        <Paperclip className="h-4 w-4" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-surface hover:text-neutral-600"
        aria-hidden
      >
        <Smile className="h-4 w-4" />
      </button>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="اكتب رسالتك هنا..."
        className="min-w-0 flex-1 rounded-full bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-neutral-400"
      />

      <button
        type="submit"
        disabled={!value.trim() || disabled}
        aria-label="إرسال"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send className="h-4 w-4 -scale-x-100" />
      </button>
    </form>
  );
}
