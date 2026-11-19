"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarCheck, Check, CheckCheck, Clock, MessageCircle, Scale, Search, Send, SendHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { askSadeem, openSadeemChat } from "@/lib/chatBus";
import { cn } from "@/lib/cn";
import { readInterest } from "@/lib/interest";
import { sadeemScenes, type Scene, type SceneCar, type SceneSource } from "./sadeemScenes";

// One scene: the question lands, Sadeem writes, the answer builds, it rests,
// then it gives way to the next one.
const SCENE_MS = 7200;
const ASK_AT = 0.15;
const TYPING_AT = 0.7;
const REPLY_AT = 1.6;
const SHOW_AT = 2.0;
const STEP = 0.14;

/** static: everything shown, nothing moves (before JavaScript, or motion turned off). */
type Mode = "static" | "waiting" | "playing";

/** A piece of the scene that comes in `at` seconds after the scene starts. */
function Piece({ at, mine, mode, className, children }: { at: number; mine?: boolean; mode: Mode; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(className, mode === "playing" && (mine ? "animate-scene-ask" : "animate-scene-in"))}
      style={mode === "playing" ? ({ animationDelay: `${at}s` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

function Thumb({ car, className }: { car: SceneCar; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-xl bg-brand-100", className)}>
      {car.image && <Image src={car.image} alt="" fill sizes="96px" className="object-cover" />}
    </span>
  );
}

// The chapters above the window (18 Nov): one bright colour and icon per thing
// Sadeem does, so the four read apart at a glance. Flat fills, no glows or
// outlines. Full class names, so Tailwind keeps them.
const CHAPTER: Record<Scene["kind"], { icon: LucideIcon; solid: string; soft: string }> = {
  cars: { icon: Search, solid: "bg-[#2563eb] text-white", soft: "text-[#1d4ed8]" },
  compare: { icon: Scale, solid: "bg-[#7c3aed] text-white", soft: "text-[#6d28d9]" },
  booking: { icon: CalendarCheck, solid: "bg-[#059669] text-white", soft: "text-[#047857]" },
  hours: { icon: MessageCircle, solid: "bg-[#ea580c] text-white", soft: "text-[#c2410c]" },
};

/** What the buyer wrote. */
function Ask({ children }: { children: ReactNode }) {
  return (
    <div className="w-fit max-w-[86%] rounded-2xl rounded-tr-md bg-brand-900 px-3 pb-1 pt-2 text-white shadow-bubble">
      <p className="text-[14px] leading-6">{children}</p>
      <CheckCheck className="ms-auto h-3.5 w-3.5 text-sky-300" />
    </div>
  );
}

function SceneBody({ scene, mode }: { scene: Scene; mode: Mode }) {
  switch (scene.kind) {
    case "cars":
      return (
        <div className="space-y-2">
          {scene.cars.map((car, i) => (
            <Piece key={car.id} at={SHOW_AT + i * STEP} mode={mode} className="flex items-center gap-2.5 rounded-2xl bg-white p-1.5 pe-3 shadow-bubble">
              <Thumb car={car} className="h-12 w-16 rounded-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold leading-5 text-brand-950">{car.name}</p>
                <p className="truncate text-[11.5px] leading-5 text-neutral-500">{car.note}</p>
              </div>
              <p className="shrink-0 text-[13.5px] font-bold text-brand-950">{car.price}</p>
            </Piece>
          ))}
        </div>
      );
    case "compare":
      return (
        <Piece at={SHOW_AT} mode={mode} className="overflow-hidden rounded-2xl bg-white shadow-bubble">
          <div className="grid grid-cols-[3.5rem_1fr_1fr] items-end gap-x-2.5 px-3 pb-2.5 pt-3">
            <span />
            {scene.cars.map((car) => (
              <div key={car.id} className="min-w-0">
                <Thumb car={car} className="h-[42px] w-full rounded-[10px]" />
                <p className="mt-1.5 truncate text-[12.5px] font-bold leading-5 text-brand-950">
                  {car.model} <span className="font-semibold text-neutral-500">{car.year}</span>
                </p>
              </div>
            ))}
          </div>
          {scene.rows.map((row, i) => (
            <Piece
              key={row.label}
              at={SHOW_AT + 0.25 + i * STEP}
              mode={mode}
              className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-x-2.5 border-t border-brand-950/[0.05] px-3 py-1.5 text-[12.5px] leading-5"
            >
              <span className="text-neutral-500">{row.label}</span>
              {row.values.map((value, side) => (
                <span key={side} className={row.better === side ? "font-bold text-brand-950" : "text-neutral-500"}>
                  {value}
                </span>
              ))}
            </Piece>
          ))}
        </Piece>
      );
    case "booking":
      return (
        <div className="space-y-2.5">
          <Piece at={SHOW_AT + 0.5} mine mode={mode}>
            <Ask>
              <bdi dir="ltr">{scene.phone}</bdi>
            </Ask>
          </Piece>
          <Piece at={SHOW_AT + 1.3} mode={mode} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-bubble">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Check className="h-[18px] w-[18px]" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold leading-5 text-brand-950">وصل طلبك لفريق المبيعات</p>
              <p className="text-[11.5px] leading-5 text-neutral-500">
                {scene.purpose === "buy" ? "شراء" : "معاينة"} {scene.car}، ب{scene.city}
              </p>
            </div>
          </Piece>
        </div>
      );
    case "hours":
      return (
        <Piece at={SHOW_AT} mode={mode} className="divide-y divide-brand-950/[0.05] rounded-2xl bg-white px-3.5 shadow-bubble">
          <div className="flex items-center gap-3 py-3">
            <Clock className="h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <p className="text-[13.5px] font-bold leading-5 text-brand-950">{scene.hours}</p>
              <p className="text-[11.5px] leading-5 text-neutral-500">{scene.afterHours}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <WhatsappIcon className="h-5 w-5 shrink-0 text-[#1fa855]" />
            <p className="text-[13.5px] font-bold leading-5 text-brand-950">
              <bdi dir="ltr">{scene.whatsapp}</bdi>
            </p>
          </div>
        </Piece>
      );
  }
}

/**
 * The picture: one scene at a time, inside the chat as the buyer really sees it
 * (16 Nov): Sadeem's header, the light conversation, the same bubbles and the
 * message box. It was a dark navy stage that looked like no chat. The
 * conversation is decorative; the message box is a real button (18 Nov): a tap
 * on it opens the real Sadeem to write in.
 */
function Stage({ scenes, active, mode, run, resting }: { scenes: Scene[]; active: number; mode: Mode; run: number; resting: boolean }) {
  const scene = scenes[active];
  return (
    <div className="mx-auto w-full max-w-[400px]">
      {/* The picture's chapters: what Sadeem does in each scene. The current one is
          filled with its colour, and a lighter sweep across it shows how far it is. */}
      <div aria-hidden className="mb-3.5 grid grid-cols-4 gap-1 rounded-full bg-brand-950/[0.06] p-1">
        {scenes.map((chapter, i) => {
          const look = CHAPTER[chapter.kind];
          const Icon = look.icon;
          const on = i === active;
          return (
            <span
              key={chapter.ask}
              className={cn(
                "relative flex h-8 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2 text-[12.5px] font-bold transition-colors duration-300",
                on ? look.solid : i < active ? look.soft : "text-neutral-500"
              )}
            >
              {on && (
                <span
                  key={run}
                  className={cn("absolute inset-0 origin-right bg-white/20", mode === "playing" && !resting ? "animate-scene-progress" : "scale-x-0")}
                  style={mode === "playing" && !resting ? { animationDuration: `${SCENE_MS}ms` } : undefined}
                />
              )}
              <Icon className="relative h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              <span className="relative truncate">{chapter.verb}</span>
            </span>
          );
        })}
      </div>

      {/* A faint shadow under the window (19 Nov: the deep one under it read as a
          heavy dark band on an iPhone). */}
      <div className="flex h-[520px] flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_1px_2px_rgba(11,19,34,0.04),0_14px_32px_-20px_rgba(11,19,34,0.16)] ring-1 ring-brand-950/[0.06]">
        {/* The chat's header, as in the real one. */}
        <div aria-hidden className="flex shrink-0 items-center gap-3 bg-brand-950 px-4 py-3 text-white">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-white/10">
            <SadeemMascot className="h-8 w-8" />
            <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-950 bg-success" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[15px] font-bold leading-6">
              سديم
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </p>
            <p className="truncate text-[12px] leading-5 text-white/70">متصل هسه، مساعدك الشخصي</p>
          </div>
        </div>

        {/* The conversation: the latest at the bottom, as a chat fills. */}
        <div aria-hidden className="chat-wallpaper flex min-h-0 flex-1 flex-col justify-end px-3 py-3.5 sm:px-4">
          <div
            key={run}
            className={cn("space-y-3", mode === "waiting" && "opacity-0", mode === "playing" && !resting && "animate-scene-out")}
            style={mode === "playing" && !resting ? { animationDelay: `${SCENE_MS - 380}ms` } : undefined}
          >
            <Piece at={ASK_AT} mine mode={mode}>
              <Ask>{scene.ask}</Ask>
            </Piece>

            {/* Sadeem's side: his head at the far edge, his words and what he shows beside it. */}
            <div className="flex flex-row-reverse items-start gap-2">
              <Piece at={TYPING_AT - 0.2} mode={mode} className="relative mt-0.5 shrink-0">
                {mode === "playing" && (
                  <span className="absolute inset-0 rounded-full border-2 border-accent-400 animate-scene-ring" style={{ animationDelay: `${TYPING_AT}s` }} />
                )}
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white ring-1 ring-black/[0.06]">
                  <SadeemMascot className="h-5 w-5" />
                </span>
              </Piece>
              <div className="min-w-0 flex-1">
                <div className="grid min-h-10 items-start [&>*]:col-start-1 [&>*]:row-start-1">
                  {mode === "playing" && (
                    <span
                      className="flex w-fit items-center gap-1 justify-self-end rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-bubble animate-scene-typing"
                      style={{ animationDelay: `${TYPING_AT}s` }}
                    >
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-brand-400" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                  )}
                  <Piece at={REPLY_AT} mode={mode} className="rounded-2xl rounded-tl-md bg-white px-3 py-1.5 shadow-bubble">
                    <p className="text-[14px] leading-6 text-neutral-800">{scene.reply}</p>
                  </Piece>
                </div>
              </div>
            </div>
            {/* What he shows: the full width on phones, under his words on wider screens. */}
            <div className="pe-8">
              <SceneBody scene={scene} mode={mode} />
            </div>
          </div>
        </div>

        {/* The message box: a real button. A tap opens Sadeem's chat to write in. */}
        <button
          type="button"
          onClick={() => openSadeemChat({ write: true })}
          aria-label="اكتب رسالتك لسديم"
          className="group flex shrink-0 items-center gap-2 border-t border-black/5 bg-white px-2.5 py-2 text-start outline-none"
        >
          <span className="flex min-w-0 flex-1 items-center rounded-full bg-surface px-4 py-2.5 text-[14px] text-neutral-400 ring-1 ring-transparent transition group-hover:bg-white group-hover:ring-brand-200 group-focus-visible:bg-white group-focus-visible:ring-2 group-focus-visible:ring-brand-600">
            {/* A caret, so the box reads as a place to write. */}
            <span aria-hidden className="me-1.5 h-[18px] w-[1.5px] shrink-0 rounded-full bg-brand-600 animate-caret motion-reduce:animate-none" />
            <span className="truncate">اكتب رسالتك هنا...</span>
          </span>
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white transition group-hover:bg-brand-800 group-active:scale-90">
            <Send className="h-[17px] w-[17px] -scale-x-100" />
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * Sadeem at work, as a moving picture, beside the questions it plays. Each
 * question is a button: it asks the real Sadeem that question.
 */
export function SadeemShowcase({
  scenes: firstScenes,
  cars,
  intro,
  outro,
}: {
  scenes: Scene[];
  cars: SceneSource[];
  intro: ReactNode;
  outro: ReactNode;
}) {
  // The server's fixed scenes first, then this visitor's: about what they told
  // Sadeem or the cars they opened, or a random set when nothing is known.
  const [scenes, setScenes] = useState(firstScenes);
  const [active, setActive] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's scenes come from this browser's storage, after hydration
    setScenes(sadeemScenes(cars, { interest: readInterest(), random: Math.random }));
    setActive(0);
  }, [cars]);
  // Replays the scene's entrance (a new key) whenever a scene starts.
  const [run, setRun] = useState(0);
  const [mode, setMode] = useState<Mode>("static");
  // The pointer or the keyboard is on a question: its scene stays up.
  const [resting, setResting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The picture starts when it scrolls into view, and stops when it's out of it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver(
      ([entry]) => {
        setMode((was) => {
          const now = entry.isIntersecting ? "playing" : "waiting";
          if (now === "playing" && was !== "playing") setRun((n) => n + 1);
          return now;
        });
      },
      { threshold: 0.35 }
    );
    seen.observe(root);
    return () => seen.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== "playing" || resting) return;
    const timer = window.setTimeout(() => {
      setActive((i) => (i + 1) % scenes.length);
      setRun((n) => n + 1);
    }, SCENE_MS);
    return () => window.clearTimeout(timer);
  }, [mode, resting, run, scenes.length]);

  const show = (index: number) => {
    setResting(true);
    if (index !== active) {
      setActive(index);
      setRun((n) => n + 1);
    }
  };
  const release = () => {
    setResting(false);
    setRun((n) => n + 1);
  };

  return (
    // Phones: the words, the picture, then the questions. Wider: the picture beside all the words.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <div className="lg:self-end">{intro}</div>

      <div ref={rootRef} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <Stage scenes={scenes} active={active} mode={mode} run={run} resting={resting} />
      </div>

      <div className="lg:self-start">
        <p className="text-sm font-semibold text-neutral-500">اضغط على سؤال، وسديم يجاوبك عليه هسه:</p>
        <ul className="-mx-3 mt-3 space-y-1">
          {scenes.map((scene, i) => {
            const on = i === active;
            return (
              <li key={scene.ask}>
                <button
                  type="button"
                  onClick={() => askSadeem(scene.ask)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && show(i)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && release()}
                  onFocus={() => show(i)}
                  onBlur={release}
                  aria-label={`اسأل سديم: ${scene.ask}`}
                  className={cn("group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-start outline-none transition-colors duration-300", on ? "bg-white/75" : "hover:bg-white/40")}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[16px] font-bold leading-7 transition-colors duration-300 sm:text-[17px]", on ? "text-brand-950" : "text-neutral-500 group-hover:text-brand-950")}>
                      {scene.ask}
                    </span>
                    <span className={cn("block text-[13px] leading-6 transition-colors duration-300", on ? "text-neutral-600" : "text-neutral-400")}>{scene.does}</span>
                  </span>
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-300 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand-600 group-active:scale-90",
                      on ? CHAPTER[scene.kind].solid : "bg-brand-950/[0.06] text-brand-800 group-hover:bg-brand-950 group-hover:text-white"
                    )}
                  >
                    <SendHorizontal className="h-[18px] w-[18px] -scale-x-100" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {outro}
      </div>
    </div>
  );
}
