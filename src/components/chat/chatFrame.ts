/** Shared by the chat panel and its loading placeholder so both occupy the same frame. */
export const CHAT_FRAME_CLASS =
  "fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white animate-fade-in sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(660px,calc(100dvh-2.5rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-black/5 sm:shadow-2xl sm:shadow-brand-950/25";

export const CHAT_HEADER_CLASS =
  "flex items-center justify-between gap-3 bg-brand-900 px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] text-white";
