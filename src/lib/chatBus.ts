const OPEN_EVENT = "sadeem:open";
const PROMPT_EVENT = "sadeem:prompt";

/** Opens the Sadeem chat widget from anywhere in the app. */
export function openSadeemChat() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
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
