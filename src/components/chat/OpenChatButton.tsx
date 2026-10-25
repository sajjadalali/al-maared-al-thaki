"use client";

import type { ReactNode } from "react";
import { askSadeem, openSadeemChat } from "@/lib/chatBus";

/**
 * A button that opens the Sadeem chat, usable inside server components. With
 * `prompt`, the chat opens and sends that message straight away.
 */
export function OpenChatButton({
  className,
  children,
  prompt,
}: {
  className?: string;
  children: ReactNode;
  prompt?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => (prompt ? askSadeem(prompt) : openSadeemChat())}
      className={className}
    >
      {children}
    </button>
  );
}
