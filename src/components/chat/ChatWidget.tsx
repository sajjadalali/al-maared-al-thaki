"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type Ref, type RefObject } from "react";
import { X } from "lucide-react";
import { onSadeemOpen, onSadeemPrompt, warmSadeem } from "@/lib/chatBus";
import { SadeemMark } from "@/components/ui/SadeemMark";
import { cn } from "@/lib/cn";
import { CHAT_AVATAR_CLASS, CHAT_FRAME_CLASS, CHAT_HEADER_CLASS, chatFrameMotion } from "./chatFrame";
import { countInviteShown, inviteLines, invitesOff, invitesShown, readVisitor, turnInvitesOff } from "./invites";
import { testMode } from "./testMode";
import type { ChatPrompt } from "./ChatPanel";

// The panel carries the conversation UI. Every page only ships this small
// launcher; the panel loads when the page is idle, or when the chat is about
// to open (hover, focus or touch on the button).
const loadPanel = () => import("./ChatPanel");

/**
 * The panel's own header and first bubble, so the swap to the real panel
 * doesn't jump. It shows only while the chat is open: the panel is also loaded
 * ahead of time on an idle page, and this must not flash there.
 */
function PanelLoading() {
  return (
    <div
      role="dialog"
      aria-label="محادثة سديم"
      aria-busy
      data-sadeem-chat
      className={cn(CHAT_FRAME_CLASS, chatFrameMotion(false), "invisible group-data-[open]/sadeem:visible")}
    >
      <div className={CHAT_HEADER_CLASS}>
        <div className="flex items-center gap-3">
          <span data-sadeem-avatar className={CHAT_AVATAR_CLASS}>
            <SadeemMark className="w-[34px]" />
          </span>
          <p className="text-base font-bold">سديم</p>
        </div>
        <X className="h-5 w-5 text-white/40" />
      </div>
      <div className="chat-wallpaper flex-1 px-3.5 py-4">
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
// Sadeem's invitations while the chat is closed (20 Nov): two in a whole visit,
// the first soon after the page settles and the second half a minute after
// it, each staying for six seconds. They came every ten seconds without end,
// up 60% of the time, and on phones covered the search button.
const MAX_INVITES = 2;
const FIRST_INVITE_MS = 4000;
const NEXT_INVITE_MS = 30_000;
const INVITE_SHOWN_MS = 6000;
// Not now (the page is scrolling, or a button is under the bubble): try again this much later.
const INVITE_RETRY_MS = 4000;
// The page must be still this long before a bubble comes up.
const SCROLL_QUIET_MS = 1200;
// Phones and tablets: the bubble goes away while the page scrolls.
const HIDE_ON_SCROLL = "(max-width: 1023px)";
// Links this small are buttons to the eye ("تصفّح السيارات"), and the bubble
// must not cover them. Bigger ones are cards (a brand, a car type), and the
// bubble may sit on their corner.
const SMALL_LINK_AREA = 12_000;
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

/**
 * Whether the bubble, laid out but still hidden, would sit on a button, a field
 * or a button-sized link of the page. Hidden, it is drawn at 75% toward its
 * bottom-right corner (see HeadBubble), so its full box is worked out from that.
 */
function coversControl(bubble: HTMLElement): boolean {
  const r = bubble.getBoundingClientRect();
  const width = r.width / 0.75;
  const height = r.height / 0.75;
  for (const fx of [0.08, 0.36, 0.64, 0.92]) {
    for (const fy of [0.2, 0.5, 0.8]) {
      const x = r.right - width + width * fx;
      const y = r.bottom - height + height * fy;
      const under = document.elementsFromPoint(x, y).find((el) => !el.closest("[data-sadeem-head]"));
      const control = under?.closest("a, button, input, select, textarea, [role='button']");
      if (!control) continue;
      if (control.tagName !== "A") return true;
      // A car card's link is its title, stretched over the whole card by a
      // pseudo-element: hit outside the title's own box, it is the card.
      const box = control.getBoundingClientRect();
      const onIt = x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      if (onIt && box.width * box.height < SMALL_LINK_AREA) return true;
    }
  }
  return false;
}

/**
 * Phones and tablets (20 Nov): Sadeem's head stays out of the way while the
 * top of the page is on screen (the homepage's navy front with its own «احچي
 * ويا سديم» button, elsewhere the header) and comes in once the page moves
 * past it: on the homepage as soon as the search under the front comes into
 * view (it waited for the front to pass the middle of the screen, a screen and
 * a half down). Laptops always show it, and so does a car page, where the head sits
 * in the price bar.
 */
function useTuckedAtTop(pathname: string) {
  const [tucked, setTucked] = useState(false);
  useLayoutEffect(() => {
    const small = window.matchMedia("(max-width: 1023px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!small.matches || document.querySelector("[data-contact-bar]")) return setTucked(false);
      const search = document.querySelector<HTMLElement>("[data-hero-search]");
      // The search's top is a little way up the screen.
      setTucked(search ? search.getBoundingClientRect().top > window.innerHeight - 60 : window.scrollY < 80);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    small.addEventListener("change", update);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      small.removeEventListener("change", update);
    };
  }, [pathname]);
  return tucked;
}

const SPOT_KEY = "sadeem-head-spot";
const EDGE = 20; // px from the screen's side, as bottom-5 / right-5
const DRAG_START = 8; // px the finger moves before a press becomes a drag
type Spot = { side: "left" | "right"; bottom: number };

function readSpot(): Spot | null {
  try {
    const spot = JSON.parse(window.localStorage.getItem(SPOT_KEY) ?? "null") as Spot | null;
    return spot && (spot.side === "left" || spot.side === "right") && Number.isFinite(spot.bottom) ? spot : null;
  } catch {
    return null;
  }
}

/** Keeps the head on screen: over the bottom edge and under the header. */
function clampBottom(bottom: number, size: number) {
  return Math.round(Math.min(Math.max(bottom, 12), window.innerHeight - size - 88));
}

/** Phones on a car page: the head sits in the price bar and stays there. */
const isDocked = () =>
  !!document.querySelector("[data-contact-bar]") && window.matchMedia("(max-width: 1023px)").matches;

/**
 * Sadeem's head can be dragged (20 Nov), like a chat head: it follows the
 * finger or the mouse, and when let go it glides to the nearer side of the
 * screen at the height it was dropped. The spot is kept for later visits. A
 * press that hardly moves is still a tap that opens the chat.
 */
function useDraggableHead(head: RefObject<HTMLElement | null>) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [dragging, setDragging] = useState(false);
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  // A drag ends in a click on the button; that click must not open the chat.
  const justDragged = useRef(false);

  useEffect(() => {
    // Read after mount: the server render has no storage.
    const saved = readSpot();
    if (saved) queueMicrotask(() => setSpot(saved));
    const refit = () =>
      setSpot((s) => (s && head.current ? { ...s, bottom: clampBottom(s.bottom, head.current.offsetWidth) } : s));
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, [head]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || isDocked()) return;
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    // A quick flick leaves the button before the first move arrives: the
    // button keeps the pointer's moves until it is let go.
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = press.current;
    const box = wrapper.current;
    if (!p || p.id !== e.pointerId || !box) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved) {
      if (Math.hypot(dx, dy) < DRAG_START) return;
      p.moved = true;
      setDragging(true);
      box.style.transition = "none";
    }
    box.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const p = press.current;
    const box = wrapper.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || !p.moved || !box || !head.current) return;
    justDragged.current = true;
    window.setTimeout(() => (justDragged.current = false), 0);
    const before = box.getBoundingClientRect();
    const next: Spot = {
      side: before.left + before.width / 2 < window.innerWidth / 2 ? "left" : "right",
      bottom: clampBottom(window.innerHeight - before.bottom, head.current.offsetWidth),
    };
    try {
      window.localStorage.setItem(SPOT_KEY, JSON.stringify(next));
    } catch {
      // Private mode: the spot lasts for this page only.
    }
    // Glide from where it was dropped to its new spot: place it there, then
    // start the motion from the drop point back to no offset.
    box.style.transform = "";
    setSpot(next);
    setDragging(false);
    requestAnimationFrame(() => {
      const after = box.getBoundingClientRect();
      box.style.transition = "";
      box.animate(
        [{ transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` }, { transform: "none" }],
        { duration: 380, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }
      );
    });
  };

  const onPointerCancel = () => {
    press.current = null;
    setDragging(false);
    if (wrapper.current) {
      wrapper.current.style.transform = "";
      wrapper.current.style.transition = "";
    }
  };

  // The saved spot goes in through custom properties, so the price bar's
  // docked place (CSS) still wins on a car page.
  const style = spot
    ? ({
        "--head-bottom": `${spot.bottom}px`,
        "--head-right": spot.side === "right" ? `${EDGE}px` : "auto",
        "--head-left": spot.side === "left" ? `${EDGE}px` : "auto",
      } as CSSProperties)
    : undefined;

  return {
    wrapperRef: wrapper,
    side: spot?.side ?? "right",
    dragging,
    style,
    wasDrag: () => justDragged.current,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}

/** The line Sadeem's head is saying now (see invites.ts), while `active`. */
function useInvite(active: boolean, onCarPage: boolean, bubble: RefObject<HTMLDivElement | null>) {
  const [invite, setInvite] = useState<{ text: string; shown: boolean } | null>(null);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!active || stopped || invitesOff() || invitesShown() >= MAX_INVITES) return;
    const lines = inviteLines(readVisitor(), onCarPage);
    let timer = 0;
    let hide = 0;
    let frame = 0;
    let scrolledAt = 0;

    function later(ms: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(tryShow, ms);
    }
    function tryShow() {
      const count = invitesShown();
      if (count >= MAX_INVITES) return;
      if (document.hidden || Date.now() - scrolledAt < SCROLL_QUIET_MS) return later(INVITE_RETRY_MS);
      const text = lines[count % lines.length];
      // Laid out hidden with its words first, so its place can be checked.
      setInvite({ text, shown: false });
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (Date.now() - scrolledAt < SCROLL_QUIET_MS || (bubble.current && coversControl(bubble.current))) {
            return later(INVITE_RETRY_MS);
          }
          countInviteShown();
          setInvite({ text, shown: true });
          hide = window.setTimeout(() => {
            setInvite((v) => v && { ...v, shown: false });
            if (count + 1 < MAX_INVITES) later(NEXT_INVITE_MS);
          }, INVITE_SHOWN_MS);
        });
      });
    }
    const onScroll = () => {
      scrolledAt = Date.now();
      setInvite((v) => (v?.shown ? { ...v, shown: false } : v));
    };

    const hidesOnScroll = window.matchMedia(HIDE_ON_SCROLL).matches;
    if (hidesOnScroll) window.addEventListener("scroll", onScroll, { passive: true });
    later(invitesShown() === 0 ? FIRST_INVITE_MS : NEXT_INVITE_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hide);
      cancelAnimationFrame(frame);
      if (hidesOnScroll) window.removeEventListener("scroll", onScroll);
      // The next round starts silent, not with the line that was up when this one ended.
      setInvite(null);
    };
  }, [active, stopped, onCarPage, bubble]);

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
  boxRef,
  side = "right",
}: {
  /** The screen side the head is on: the bubble opens toward the middle. */
  side?: "left" | "right";
  text: string;
  shown: boolean;
  onOpen: () => void;
  /** The bubble's outer box, for checking what it would cover. */
  boxRef?: Ref<HTMLDivElement>;
  /** With this, the bubble has a ✕ that stops the invitations. */
  onStop?: () => void;
}) {
  return (
    <div
      ref={boxRef}
      inert={!shown}
      className={cn(
        "absolute bottom-1.5 w-max max-w-[min(17.5rem,calc(100vw-6.75rem))] transition duration-300 ease-(--ease-sheet)",
        side === "right" ? "right-full mr-3 origin-bottom-right" : "left-full ml-3 origin-bottom-left",
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
        className={cn(
          "block rounded-[20px] bg-white px-4 py-3 text-start text-[14px] font-semibold leading-6 text-brand-950 shadow-[0_10px_32px_-6px_rgba(11,19,34,0.28)] ring-1 ring-brand-950/[0.06]",
          side === "right" ? "rounded-br-md" : "rounded-bl-md"
        )}
      >
        {text}
      </button>
      {onStop && (
        <button
          type="button"
          onClick={onStop}
          aria-label="إيقاف رسائل سديم"
          className={cn("tap-target absolute -top-2.5 flex", side === "right" ? "-left-2.5" : "-right-2.5", "h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md ring-1 ring-brand-950/10 transition hover:text-brand-950")}
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
    warmSadeem();
    launcherBox.current = headRef.current?.getBoundingClientRect() ?? null;
    // The chat grows out of the head wherever it was dragged: its transform
    // origin is the head's centre, in the frame's own box (full screen on
    // phones; 400 wide, 20 px off the bottom-right corner on larger screens).
    const head = launcherBox.current;
    if (head) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const phone = w < 640;
      const left = phone ? 0 : w - 20 - 400;
      const top = phone ? 0 : h - 20 - Math.min(660, h - 40);
      const x = Math.round(head.left + head.width / 2 - left);
      const y = Math.round(head.top + head.height / 2 - top);
      document.documentElement.style.setProperty("--sadeem-origin", `${x}px ${y}px`);
    }
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

  // The page on screen, for the history handler (which runs before the next page renders).
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      if (!window.history.state?.sadeemChat) return closeChat(false);
      // Back onto the chat's entry from another page (a car the chat showed):
      // the chat comes back. Onto it from the same page is the browser's
      // forward button or a stray swipe after the chat was closed: nobody
      // asked for the chat, so it stays closed.
      if (window.location.pathname === pathRef.current) return;
      setKeepOpenOn(window.location.pathname);
      openChat(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [openChat, closeChat]);

  // A new page (a car card in the chat, the header, the back button): the
  // chat slides away once it is there, so that page is what the buyer sees.
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
    const face = fly.querySelector<HTMLElement>("[data-fly-light]");
    const fade = face?.animate(flight === "open" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
      duration: flight === "open" ? FLY_OPEN_MS : FLY_CLOSE_MS,
      easing: "ease-in-out",
      fill: "both",
    });
    motion.onfinish = done;
    // A background tab may never run the animation: don't leave the head hidden.
    const fallback = window.setTimeout(done, 700);
    return () => {
      window.clearTimeout(fallback);
      motion.onfinish = null;
      motion.cancel();
      fade?.cancel();
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

  const tucked = useTuckedAtTop(pathname);
  const { wrapperRef: headBoxRef, side: headSide, dragging, style: headStyle, wasDrag, handlers: dragHandlers } = useDraggableHead(headRef);
  const inviteBox = useRef<HTMLDivElement>(null);
  const invite = useInvite(phase === "closed" && !flight && !unread && !resumeHint && !tucked && !dragging, /^\/cars\/.+/.test(pathname), inviteBox);
  const status = unread ? "سديم رد عليك" : "رجوع للمحادثة";
  const label = unread ? "سديم رد عليك" : started ? "كمّل مع سديم" : "احچي ويا سديم";

  return (
    <div className="group/sadeem contents" data-flight={flight ?? undefined} data-open={phase === "open" || undefined}>
      {phase !== "open" && (
        // Sadeem's head: a navy circle with a white edge (seen on light and dark
        // bands alike), sending out rings of colour. It stays
        // hidden while its flying copy is on the way back from the chat.
        <div
          ref={headBoxRef}
          data-sadeem-head
          style={headStyle}
          className={cn(
            "fixed bottom-[var(--head-bottom,1.25rem)] left-[var(--head-left,auto)] right-[var(--head-right,1.25rem)] z-50 docked:bottom-[max(0.625rem,env(safe-area-inset-bottom))] docked:left-auto docked:right-3",
            "transition duration-300 ease-out",
            !started && "animate-pop-in",
            flight === "close" && "invisible",
            tucked && "pointer-events-none translate-y-4 scale-75 opacity-0"
          )}
          inert={tucked}
        >
          {/* A beacon (20 Nov): two amber rings go out together with a burst of
              Sadeem's typing dots, then rest; it comes back every 7 seconds. */}
          <span
            data-pulse
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-accent-400 animate-head-beacon"
          />
          <span
            data-pulse
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-accent-400 animate-head-beacon [animation-delay:0.55s]"
          />
          <button
            ref={headRef}
            type="button"
            onClick={() => {
              if (!wasDrag()) openChat();
            }}
            {...dragHandlers}
            onPointerEnter={warmUp}
            onTouchStart={warmUp}
            onFocus={warmUp}
            aria-label={label}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-950 shadow-[0_8px_24px_-4px_rgba(11,19,34,0.35)] ring-2 ring-white transition duration-200 touch-none select-none hover:scale-105 active:scale-95 sm:h-[72px] sm:w-[72px] docked:h-[58px] docked:w-[58px]"
          >
            <SadeemMark tone="light" animated="burst" line={1.7} className="w-[68%]" />
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-success" />
            {unread && (
              <span className="absolute -left-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[11px] font-bold leading-none text-white">
                1
              </span>
            )}
          </button>
          <HeadBubble side={headSide} text={status} shown={(unread || resumeHint) && !tucked && !dragging} onOpen={() => openChat()} />
          <HeadBubble side={headSide} text={invite.text} shown={invite.shown && !dragging} onOpen={() => openChat()} onStop={invite.stop} boxRef={inviteBox} />
        </div>
      )}

      {flight && (
        <span
          ref={flyRef}
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-full shadow-[0_8px_24px_-4px_rgba(11,19,34,0.35)] ring-2 ring-white will-change-transform"
        >
          {/* The launcher's navy face turns into the header's white one on the way
              (and back): the header is navy, so its face is white to stand out. */}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-950">
            <SadeemMark tone="light" line={1.7} className="w-[68%]" />
          </span>
          <span data-fly-light className="absolute inset-0 flex items-center justify-center rounded-full bg-white opacity-0">
            <SadeemMark line={1.7} className="w-[68%]" />
          </span>
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
