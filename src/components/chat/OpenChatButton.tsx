"use client";

import type { ComponentProps } from "react";
import { askSadeem, openSadeemChat } from "@/lib/chatBus";

/**
 * A button that opens the Sadeem chat, usable inside server components. With
 * `prompt`, the chat opens and sends that message straight away.
 */
export function OpenChatButton({
  prompt,
  ...props
}: Omit<ComponentProps<"button">, "type" | "onClick"> & { prompt?: string }) {
  return (
    <button {...props} type="button" onClick={() => (prompt ? askSadeem(prompt) : openSadeemChat())} />
  );
}
