"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { onSadeemOpen, onSadeemPrompt } from "@/lib/chatBus";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { cn } from "@/lib/cn";
import { CHAT_FRAME_CLASS, CHAT_HEADER_CLASS, chatFrameMotion } from "./chatFrame";
import type { ChatPrompt } from "./ChatPanel";

// The panel carries the conversation UI. Every page only ships this small
// launcher; the panel loads when the page is idle, or when the chat is about
// to open (hover, focus or touch on the button).
const loadPanel = () => import("./ChatPanel");

/** The panel's own header and first bubble, so the swap to the real panel doesn't jump. */
function PanelLoading() {
  return (
    <div role="dialog" aria-label="محادثة سديم" aria-busy data-sadeem-chat className={cn(CHAT_FRAME_CLASS, chatFrameMotion(false))}>
      <div className={CHAT_HEADER_CLASS}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
            <SadeemMascot className="h-9 w-9" />
          </span>
          <p className="text-base font-bold">سديم</p>
        </div>
        <X className="h-5 w-5 text-white/40" />
      </div>
      <div className="flex-1 bg-[#f2f5f9] px-3.5 py-4">
        <div className="ms-9 h-[92px] max-w-[80%] animate-pulse rounded-2xl rounded-tl-md bg-white" />
      </div>
    </div>
  );
}

const ChatPanel = dynamic(loadPanel, { ssr: false, loading: PanelLoading });

// How long the button says "رجوع للمحادثة" after the chat got out of the way.
const RESUME_HINT_MS = 6000;
// The longest an exit animation runs (then the panel hides even if no
// animationend arrived, e.g. in a background tab).
const EXIT_MS = 400;
// A car card was tapped: wait this long at most for its page before stepping aside.
const NAVIGATION_WAIT_MS = 3500;

/** Phones get the full-screen sheet (and the page behind it shouldn't scroll). */
const isPhone = () => window.matchMedia("(max-width: 639px)").matches;

type Phase = "closed" | "open" | "leaving";

export function ChatWidget() {
  const [phase, setPhase] = useState<Phase>("closed");
  // The panel mounts hidden once the page is idle (or on the first touch of
  // the button), so opening only changes its state and its entrance runs once
  // (mounted at the tap, a placeholder rose first and then the panel again).
  // It then stays mounted, so the conversation and any reply on its way survive.
  const [mounted, setMounted] = useState(false);
  // The buyer has opened the chat at least once (the button's wording).
  const [started, setStarted] = useState(false);
  // A car card was tapped and its page is loading; the chat stays until it's there.
  const [navigating, setNavigating] = useState(false);
  const [resumeHint, setResumeHint] = useState(false);
  const [unread, setUnread] = useState(false);
  const [prompt, setPrompt] = useState<ChatPrompt | null>(null);
  // When the chat started opening (the panel, if it mounts mid-way, picks up the motion there).
  const [openedAt, setOpenedAt] = useState(0);
  // Back onto the chat's own history entry: the page that comes back keeps the chat open.
  const [keepOpenOn, setKeepOpenOn] = useState<string | null>(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // The back button closes the chat instead of leaving the page: opening adds
  // a history entry (Next.js keeps its own state in it), closing removes it.
  const openChat = useCallback((fromHistory = false) => {
    if (phaseRef.current === "open") return;
    setPhase("open");
    setOpenedAt(performance.now());
    setMounted(true);
    setStarted(true);
    setUnread(false);
    setResumeHint(false);
    if (!fromHistory && !window.history.state?.sadeemChat) window.history.pushState({ sadeemChat: true }, "");
  }, []);

  const closeChat = useCallback((hint: boolean) => {
    if (phaseRef.current !== "open") return;
    setPhase("leaving");
    setNavigating(false);
    if (hint) setResumeHint(true);
  }, []);

  /** Closed by the buyer (✕ or Escape): also drop the history entry the chat added. */
  const dismiss = useCallback(() => {
    if (window.history.state?.sadeemChat) window.history.back();
    else closeChat(false);
  }, [closeChat]);

  const finishLeaving = useCallback(() => setPhase((p) => (p === "leaving" ? "closed" : p)), []);
  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(finishLeaving, EXIT_MS);
    return () => clearTimeout(timer);
  }, [phase, finishLeaving]);

  useEffect(() => {
    const onPop = () => {
      // Back onto the chat's entry (from a car page): the chat comes back.
      if (window.history.state?.sadeemChat) {
        setKeepOpenOn(window.location.pathname);
        openChat(true);
      } else closeChat(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [openChat, closeChat]);

  // A new page (a car card in the chat, the header, the back button): the
  // chat slides away once it is there, so that page is what the buyer sees.
  const pathname = usePathname();
  const [shownPath, setShownPath] = useState(pathname);
  // (Next.js adds the new page's history entry only after this render, so the
  // entry can't tell a new page from a return; the back button's flag does.)
  if (pathname !== shownPath) {
    setShownPath(pathname);
    if (keepOpenOn) setKeepOpenOn(null);
    if (phase === "open" && pathname !== keepOpenOn) {
      setPhase("leaving");
      setNavigating(false);
      setResumeHint(true);
    }
  }

  useEffect(() => {
    if (!navigating) return;
    const timer = setTimeout(() => closeChat(true), NAVIGATION_WAIT_MS);
    return () => clearTimeout(timer);
  }, [navigating, closeChat]);

  // The page behind the full-screen sheet stays put.
  useEffect(() => {
    if (phase !== "open" || !isPhone()) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "open") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, dismiss]);

  useEffect(() => {
    if (!resumeHint) return;
    const timer = setTimeout(() => setResumeHint(false), RESUME_HINT_MS);
    return () => clearTimeout(timer);
  }, [resumeHint]);

  // Load and mount the panel (hidden) once the page is idle, so the first tap opens it at once.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => void loadPanel().then(() => setMounted(true)), { timeout: 4000 });
    return () => cancel(id);
  }, []);

  useEffect(() => onSadeemOpen(() => openChat()), [openChat]);
  useEffect(
    () =>
      onSadeemPrompt((text) => {
        setPrompt({ id: Date.now(), text });
        openChat();
      }),
    [openChat]
  );

  const clearPrompt = useCallback(() => setPrompt(null), []);
  const handleReply = useCallback(() => {
    if (phaseRef.current !== "open") setUnread(true);
  }, []);
  const handleNavigate = useCallback(() => setNavigating(true), []);
  const warmUp = () => void loadPanel().then(() => setMounted(true));

  const label = unread ? "سديم رد عليك" : resumeHint ? "رجوع للمحادثة" : started ? "كمّل مع سديم" : "تحدث مع سديم";

  return (
    <>
      {phase !== "open" && (
        // Pops in while the chat slides away, where the chat went.
        <button
          type="button"
          onClick={() => openChat()}
          onPointerEnter={warmUp}
          onTouchStart={warmUp}
          onFocus={warmUp}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-950 py-2.5 pe-5 ps-2.5 text-white shadow-xl shadow-brand-950/30 ring-1 ring-white/10 transition hover:bg-brand-800 active:scale-95 animate-pop-in docked:bottom-[max(0.75rem,env(safe-area-inset-bottom))] docked:right-4 docked:p-0.5 docked:shadow-md"
          aria-label={label}
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <SadeemMascot className="h-8 w-8" />
            <span
              className={cn(
                "absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-950",
                unread ? "bg-accent-500 animate-pulse" : "bg-success"
              )}
            />
          </span>
          {/* On phones the button is just Sadeem's face, except right after the chat stepped aside.
              In the price bar of a car page, that wording shows as a bubble above the face. */}
          <span
            className={cn(
              "text-sm font-bold",
              unread || resumeHint ? "inline" : "hidden sm:inline",
              "docked:absolute docked:bottom-full docked:right-0 docked:mb-2 docked:whitespace-nowrap docked:rounded-full docked:bg-brand-950 docked:px-3.5 docked:py-2 docked:shadow-lg docked:shadow-brand-950/25",
              !(unread || resumeHint) && "docked:hidden"
            )}
          >
            {label}
          </span>
        </button>
      )}

      {mounted && (
        <ChatPanel
          phase={phase}
          openedAt={openedAt}
          navigating={navigating}
          onExited={finishLeaving}
          onClose={dismiss}
          onNavigate={handleNavigate}
          onReply={handleReply}
          prompt={prompt}
          onPromptHandled={clearPrompt}
        />
      )}
    </>
  );
}
