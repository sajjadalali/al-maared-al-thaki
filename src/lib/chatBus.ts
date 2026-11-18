const OPEN_EVENT = "sadeem:open";
const PROMPT_EVENT = "sadeem:prompt";

const WRITE_EVENT = "sadeem:write";
// Set when the chat should open ready to type; the message box takes it when
// it mounts (the chat loads on first open) or hears the event (already open).
let writePending = false;

/**
 * Opens the Sadeem chat widget from anywhere in the app. With `write`, the
 * message box gets the focus, ready for the buyer to type (18 Nov: the message
 * box in the home page's demo).
 */
export function openSadeemChat({ write = false }: { write?: boolean } = {}) {
  if (write) writePending = true;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  if (write) window.dispatchEvent(new CustomEvent(WRITE_EVENT));
}

/** Whether the chat was opened to write in, once: the first caller takes it. */
export function takeWriteRequest() {
  const was = writePending;
  writePending = false;
  return was;
}

export function onSadeemWrite(handler: () => void) {
  window.addEventListener(WRITE_EVENT, handler);
  return () => window.removeEventListener(WRITE_EVENT, handler);
}

/** Opens the chat widget and sends a prefilled message on Sadeem's behalf. */
export function askSadeem(message: string) {
  window.dispatchEvent(new CustomEvent(PROMPT_EVENT, { detail: message }));
}

export function onSadeemOpen(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

export function onSadeemPrompt(handler: (message: string) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(PROMPT_EVENT, listener);
  return () => window.removeEventListener(PROMPT_EVENT, listener);
}
