"use client";

import type { ReactNode } from "react";
import { openSadeemChat } from "@/lib/chatBus";

/** A button that opens the Sadeem chat, usable inside server components. */
export function OpenChatButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => openSadeemChat()} className={className}>
      {children}
    </button>
  );
}
