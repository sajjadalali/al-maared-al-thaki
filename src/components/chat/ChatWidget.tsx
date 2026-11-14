"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { onSadeemOpen, onSadeemPrompt } from "@/lib/chatBus";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { cn } from "@/lib/cn";
import { CHAT_AVATAR_CLASS, CHAT_FRAME_CLASS, CHAT_HEADER_CLASS, chatFrameMotion } from "./chatFrame";
import { inviteLines, invitesOff, readVisitor, turnInvitesOff } from "./invites";
import { testMode } from "./testMode";
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
          <span data-sadeem-avatar className={CHAT_AVATAR_CLASS}>
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

// How long the head says "رجوع للمحادثة" after the chat got out of the way.
const RESUME_HINT_MS = 6000;
// The longest an exit animation runs (then the panel hides even if no
// animationend arrived, e.g. in a background tab).
const EXIT_MS = 400;
// A car card was tapped: wait this long at most for its page before stepping aside.
const NAVIGATION_WAIT_MS = 3500;
// Sadeem's invitations while the chat is closed: the first one soon after the
// page settles, then one every ten seconds, each staying for six.
const FIRST_INVITE_MS = 3500;
const INVITE_EVERY_MS = 10_000;
const INVITE_SHOWN_MS = 6000;
// The head's flight between the launcher and the chat header.
const FLY_OPEN_MS = 360;
const FLY_CLOSE_MS = 340;

/** Phones get the full-screen sheet (and the page behind it shouldn't scroll). */
const isPhone = () => window.matchMedia("(max-width: 639px)").matches;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Phase = "closed" | "open" | "leaving";
type Box = Pick<DOMRect, "left" | "top" | "width" | "height">;

/**
 * Where Sadeem's face sits in the chat header, from the layout alone: the
 * frame is mid-animation (scaled) when this is asked, so its drawn box can't
 * be used.
 */
function avatarBox(): Box | null {
  const avatar = document.querySelector<HTMLElement>("[data-sadeem-chat] [data-sadeem-avatar]");
  const frame = avatar?.closest<HTMLElement>("[data-sadeem-chat]");
  if (!avatar || !frame) return null;
  let left = frame.offsetLeft + frame.clientLeft;
  let top = frame.offsetTop + frame.clientTop;
  for (let node: HTMLElement | null = avatar; node && node !== frame; node = node.offsetParent as HTMLElement | null) {
    left += node.offsetLeft;
    top += node.offsetTop;
  }
  return { left, top, width: avatar.offsetWidth, height: avatar.offsetHeight };
}

/** The line Sadeem's head is saying now (see invites.ts), while `active`. */
function useInvite(active: boolean, onCarPage: boolean) {
  const [invite, setInvite] = useState<{ text: string; shown: boolean } | null>(null);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!active || stopped || invitesOff()) return;
    const lines = inviteLines(readVisitor(), onCarPage);
    let next = 0;
    let hide = 0;
    let every = 0;
    const show = () => {
      if (document.hidden) return;
      setInvite({ text: lines[next++ % lines.length], shown: true });
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setInvite((v) => v && { ...v, shown: false }), INVITE_SHOWN_MS);
    };
    const first = window.setTimeout(() => {
      show();
      every = window.setInterval(show, INVITE_EVERY_MS);
    }, FIRST_INVITE_MS);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(hide);
      window.clearInterval(every);
      // The next round starts silent, not with the line that was up when this one ended.
      setInvite(null);
    };
  }, [active, stopped, onCarPage]);

  const stop = useCallback(() => {
    turnInvitesOff();
    setStopped(true);
  }, []);
  return { text: invite?.text ?? "", shown: active && !stopped && Boolean(invite?.shown), stop };
}

/** What the head says, in a bubble beside it (above it in a car page's price bar). */
function HeadBubble({
  text,
  shown,
  onOpen,
  onStop,
}: {
  text: string;
  shown: boolean;
  onOpen: () => void;
  /** With this, the bubble has a ✕ that stops the invitations. */
  onStop?: () => void;
}) {
  return (
    <div
      inert={!shown}
      className={cn(
        "absolute bottom-1.5 right-full mr-3 w-max max-w-[min(17.5rem,calc(100vw-6.75rem))] origin-bottom-right transition duration-300 ease-(--ease-sheet)",
        "docked:bottom-full docked:right-0 docked:mb-3 docked:mr-0 docked:max-w-[min(17.5rem,calc(100vw-2rem))]",
        shown ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
      )}
    >
      {/* The head itself is the labelled button; this repeats it for the eye. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onOpen}
        className="block rounded-[20px] rounded-br-md bg-white px-4 py-3 text-start text-[14px] font-semibold leading-6 text-brand-950 shadow-[0_10px_32px_-6px_rgba(11,19,34,0.28)] ring-1 ring-brand-950/[0.06]"
      >
        {text}
      </button>
      {onStop && (
        <button
          type="button"
          onClick={onStop}
          aria-label="إيقاف رسائل سديم"
          className="tap-target absolute -left-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md ring-1 ring-brand-950/10 transition hover:text-brand-950"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

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
  // The head on its way between the launcher and the chat header.
  const [flight, setFlight] = useState<"open" | "close" | null>(null);
  const headRef = useRef<HTMLButtonElement>(null);
  const flyRef = useRef<HTMLSpanElement>(null);
  // Where the launcher's head was when the chat opened (it is gone by the time the flight starts).
  const launcherBox = useRef<Box | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ?test or ?test=0 on the page the visitor landed on, before they move on and the address loses it.
  useEffect(() => {
    testMode();
  }, []);

  // The back button closes the chat instead of leaving the page: opening adds
  // a history entry (Next.js keeps its own state in it), closing removes it.
  const openChat = useCallback((fromHistory = false) => {
    if (phaseRef.current === "open") return;
    launcherBox.current = headRef.current?.getBoundingClientRect() ?? null;
    setFlight("open");
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
    setFlight("close");
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
      setFlight("close");
      setPhase("leaving");
      setNavigating(false);
      setResumeHint(true);
    }
  }

  // The head flies from the launcher into the chat header as the chat grows out
  // of it, and back (landing with a small bounce) as the chat shrinks into it.
  useLayoutEffect(() => {
    if (!flight) return;
    const done = () => setFlight(null);
    const fly = flyRef.current;
    const avatar = avatarBox();
    const launcher = flight === "open" ? launcherBox.current : headRef.current?.getBoundingClientRect();
    if (!fly || !avatar || !launcher || reducedMotion()) {
      queueMicrotask(done);
      return;
    }
    const [from, to] = flight === "open" ? [launcher, avatar] : [avatar, launcher];
    Object.assign(fly.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    const start = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
    const motion = fly.animate(
      flight === "open"
        ? [{ transform: start }, { transform: "none" }]
        : [{ transform: start }, { transform: "scale(1.12)", offset: 0.72 }, { transform: "none" }],
      {
        duration: flight === "open" ? FLY_OPEN_MS : FLY_CLOSE_MS,
        easing: flight === "open" ? "cubic-bezier(0.32, 0.72, 0, 1)" : "cubic-bezier(0.3, 0, 0.3, 1)",
        fill: "both",
      }
    );
    motion.onfinish = done;
    // A background tab may never run the animation: don't leave the head hidden.
    const fallback = window.setTimeout(done, 700);
    return () => {
      window.clearTimeout(fallback);
      motion.onfinish = null;
      motion.cancel();
    };
  }, [flight]);

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

  const invite = useInvite(phase === "closed" && !flight && !unread && !resumeHint, /^\/cars\/.+/.test(pathname));
  const status = unread ? "سديم رد عليك" : "رجوع للمحادثة";
  const label = unread ? "سديم رد عليك" : started ? "كمّل مع سديم" : "تحدث مع سديم";

  return (
    <div className="group/sadeem contents" data-flight={flight ?? undefined}>
      {phase !== "open" && (
        // Sadeem's head: a white circle sending out rings of colour. It stays
        // hidden while its flying copy is on the way back from the chat.
        <div
          data-sadeem-head
          className={cn(
            "fixed bottom-5 right-5 z-50 docked:bottom-[max(0.625rem,env(safe-area-inset-bottom))] docked:right-3",
            !started && "animate-pop-in",
            flight === "close" && "invisible"
          )}
        >
          <span data-pulse aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-accent-400 animate-head-pulse" />
          <span
            data-pulse
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-accent-400 animate-head-pulse [animation-delay:0.55s]"
          />
          <button
            ref={headRef}
            type="button"
            onClick={() => openChat()}
            onPointerEnter={warmUp}
            onTouchStart={warmUp}
            onFocus={warmUp}
            aria-label={label}
            className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white shadow-[0_8px_24px_-4px_rgba(11,19,34,0.3)] ring-1 ring-brand-950/[0.08] transition duration-200 hover:scale-105 active:scale-95 docked:h-[52px] docked:w-[52px]"
          >
            <SadeemMascot className="h-[80%] w-[80%]" />
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-success" />
            {unread && (
              <span className="absolute -left-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[11px] font-bold leading-none text-white">
                1
              </span>
            )}
          </button>
          <HeadBubble text={status} shown={unread || resumeHint} onOpen={() => openChat()} />
          <HeadBubble text={invite.text} shown={invite.shown} onOpen={() => openChat()} onStop={invite.stop} />
        </div>
      )}

      {flight && (
        <span
          ref={flyRef}
          aria-hidden
          className="pointer-events-none fixed z-[60] flex items-center justify-center rounded-full bg-white shadow-[0_8px_24px_-4px_rgba(11,19,34,0.3)] will-change-transform"
        >
          <SadeemMascot className="h-[80%] w-[80%]" />
        </span>
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
    </div>
  );
}
