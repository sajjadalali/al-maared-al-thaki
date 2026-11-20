/** Shared by the chat panel and its loading placeholder so both occupy the same frame. */
// data-keyboard (phones, typing): a white spread shadow fills whatever the
// browser leaves around the frame, so no strip of the page shows between the
// input and the keyboard (iOS 26 Safari floats its address bar there).
export const CHAT_FRAME_CLASS =
  "group/frame data-[keyboard]:shadow-[0_0_0_100vh_#fff] fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(660px,calc(100dvh-2.5rem))] sm:w-[400px] origin-[calc(100%-3rem)_calc(100%-3rem)] sm:origin-[calc(100%-1.75rem)_calc(100%-1.75rem)] sm:rounded-3xl sm:border sm:border-black/5 sm:shadow-2xl sm:shadow-brand-950/25";

/**
 * How the frame moves: it grows out of Sadeem's head (the launcher, whose
 * centre is the frame's transform-origin) and shrinks back into it.
 */
export function chatFrameMotion(leaving: boolean) {
  return leaving ? "animate-chat-close" : "animate-chat-open";
}

/**
 * Sadeem's face in the chat header. The launcher's head flies to this spot
 * when the chat opens and back when it closes; the real one hides meanwhile.
 */
export const CHAT_AVATAR_CLASS =
  "relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-950 ring-2 ring-white/20 group-data-[flight]/sadeem:opacity-0";

export const CHAT_HEADER_CLASS =
  "relative flex shrink-0 items-center justify-between gap-3 bg-brand-950 px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] text-white group-data-[keyboard]/frame:py-1.5";
