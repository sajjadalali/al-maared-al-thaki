"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Clock, SendHorizontal } from "lucide-react";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { askSadeem } from "@/lib/chatBus";
import { cn } from "@/lib/cn";
import type { Scene, SceneCar } from "./sadeemScenes";

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

/** What the buyer wrote. */
function Ask({ children }: { children: ReactNode }) {
  return (
    <p className="w-fit max-w-[88%] rounded-[22px] rounded-br-md bg-white px-4 py-2.5 text-[15px] font-semibold leading-7 text-brand-950 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
      {children}
    </p>
  );
}

function SceneBody({ scene, mode }: { scene: Scene; mode: Mode }) {
  switch (scene.kind) {
    case "cars":
      return (
        <div className="space-y-2">
          {scene.cars.map((car, i) => (
            <Piece key={car.id} at={SHOW_AT + i * STEP} mode={mode} className="flex items-center gap-3 rounded-2xl bg-white p-2 pe-4">
              <Thumb car={car} className="h-[58px] w-[78px] sm:h-[64px] sm:w-[88px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold leading-6 text-brand-950">{car.name}</p>
                <p className="truncate text-[12.5px] leading-5 text-neutral-500">{car.note}</p>
              </div>
              <p className="shrink-0 text-[14.5px] font-bold text-brand-950">{car.price}</p>
            </Piece>
          ))}
        </div>
      );
    case "compare":
      return (
        <Piece at={SHOW_AT} mode={mode} className="overflow-hidden rounded-2xl bg-white">
          <div className="grid grid-cols-[4.25rem_1fr_1fr] items-end gap-x-3 px-4 pb-3 pt-4">
            <span />
            {scene.cars.map((car) => (
              <div key={car.id} className="min-w-0">
                <Thumb car={car} className="h-[50px] w-full sm:h-[58px]" />
                <p className="mt-2 truncate text-[13.5px] font-bold leading-5 text-brand-950">
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
              className="grid grid-cols-[4.25rem_1fr_1fr] items-center gap-x-3 border-t border-brand-100 px-4 py-2 text-[13.5px] leading-6"
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
        <div className="space-y-3">
          <Piece at={SHOW_AT + 0.5} mine mode={mode}>
            <Ask>
              <bdi dir="ltr">{scene.phone}</bdi>
            </Ask>
          </Piece>
          <Piece at={SHOW_AT + 1.3} mode={mode} className="flex items-center gap-3.5 rounded-2xl bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-bold leading-6 text-brand-950">وصل طلبك لفريق المبيعات</p>
              <p className="text-[12.5px] leading-5 text-neutral-500">
                تجربة قيادة {scene.car}، ب{scene.city}
              </p>
            </div>
          </Piece>
        </div>
      );
    case "hours":
      return (
        <Piece at={SHOW_AT} mode={mode} className="divide-y divide-brand-100 rounded-2xl bg-white px-4">
          <div className="flex items-center gap-3.5 py-3.5">
            <Clock className="h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <p className="text-[14px] font-bold leading-6 text-brand-950">{scene.hours}</p>
              <p className="text-[12.5px] leading-5 text-neutral-500">{scene.support}</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 py-3.5">
            <WhatsappIcon className="h-5 w-5 shrink-0 text-[#1fa855]" />
            <p className="text-[14px] font-bold leading-6 text-brand-950">
              <bdi dir="ltr">{scene.whatsapp}</bdi>
            </p>
          </div>
        </Piece>
      );
  }
}

/** The picture: one scene at a time, on a dark stage. Decorative; the questions beside it are the controls. */
function Stage({ scenes, active, mode, run, resting }: { scenes: Scene[]; active: number; mode: Mode; run: number; resting: boolean }) {
  const scene = scenes[active];
  return (
    <div
      aria-hidden
      className="relative flex h-[520px] flex-col overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#18273f_0%,#101b2e_100%)] px-5 pb-6 pt-5 ring-1 ring-white/10 sm:h-[540px] sm:px-8 sm:pt-6"
    >
      {/* The picture's chapters: what Sadeem does in each scene, and how far the current one is. */}
      <div className="flex gap-2">
        {scenes.map((chapter, i) => (
          <div key={chapter.ask} className="min-w-0 flex-1">
            <span className="block h-[3px] overflow-hidden rounded-full bg-white/15">
              {i < active && <span className="block h-full bg-white/70" />}
              {i === active && (
                <span
                  key={run}
                  className={cn("block h-full origin-right bg-accent-400", mode === "playing" && !resting && "animate-scene-progress")}
                  style={mode === "playing" && !resting ? { animationDuration: `${SCENE_MS}ms` } : undefined}
                />
              )}
            </span>
            <span className={cn("mt-2 block text-[13px] font-semibold leading-5 transition-colors duration-300", i === active ? "text-white" : "text-white/35")}>
              {chapter.verb}
            </span>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div
          key={run}
          className={cn("space-y-4", mode === "waiting" && "opacity-0", mode === "playing" && !resting && "animate-scene-out")}
          style={mode === "playing" && !resting ? { animationDelay: `${SCENE_MS - 380}ms` } : undefined}
        >
          <Piece at={ASK_AT} mine mode={mode}>
            <Ask>{scene.ask}</Ask>
          </Piece>

          {/* Sadeem's side: his head at the far edge, his words and what he shows beside it. */}
          <div className="flex flex-row-reverse items-start gap-3 sm:gap-4">
            <Piece at={TYPING_AT - 0.2} mode={mode} className="relative mt-0.5 shrink-0">
              {mode === "playing" && (
                <span className="absolute inset-0 rounded-full border-2 border-accent-400 animate-scene-ring" style={{ animationDelay: `${TYPING_AT}s` }} />
              )}
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <SadeemMascot className="h-8 w-8" />
              </span>
            </Piece>
            <div className="min-w-0 flex-1">
              <div className="grid min-h-10 items-center [&>*]:col-start-1 [&>*]:row-start-1">
                {mode === "playing" && (
                  <span className="flex w-fit items-center gap-1.5 justify-self-end animate-scene-typing" style={{ animationDelay: `${TYPING_AT}s` }}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce-dot rounded-full bg-white/70" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                )}
                <Piece at={REPLY_AT} mode={mode}>
                  <p className="text-[15px] leading-7 text-white/90">{scene.reply}</p>
                </Piece>
              </div>
            </div>
          </div>
          {/* What he shows: the full width on phones, under his words on wider screens. */}
          <div className="sm:pe-14">
            <SceneBody scene={scene} mode={mode} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sadeem at work, as a moving picture, beside the questions it plays. Each
 * question is a button: it asks the real Sadeem that question.
 */
export function SadeemShowcase({ scenes, intro, outro }: { scenes: Scene[]; intro: ReactNode; outro: ReactNode }) {
  const [active, setActive] = useState(0);
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
      <div className="lg:self-end">{intro}</div>

      <div ref={rootRef} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <Stage scenes={scenes} active={active} mode={mode} run={run} resting={resting} />
      </div>

      <div className="lg:self-start">
        <p className="text-sm font-semibold text-white/55">اضغط سؤالاً، وسديم يجيبك عليه الآن:</p>
        <ul className="mt-3 border-t border-white/10">
          {scenes.map((scene, i) => {
            const on = i === active;
            return (
              <li key={scene.ask} className="relative border-b border-white/10">
                <button
                  type="button"
                  onClick={() => askSadeem(scene.ask)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && show(i)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && release()}
                  onFocus={() => show(i)}
                  onBlur={release}
                  aria-label={`اسأل سديم: ${scene.ask}`}
                  className="group flex w-full items-center gap-4 py-4 text-start outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[16px] font-bold leading-7 transition-colors duration-300 sm:text-[17px]", on ? "text-white" : "text-white/55 group-hover:text-white")}>
                      {scene.ask}
                    </span>
                    <span className={cn("block text-[13px] leading-6 transition-colors duration-300", on ? "text-white/60" : "text-white/35")}>{scene.does}</span>
                  </span>
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-300 group-focus-visible:ring-2 group-focus-visible:ring-accent-300 group-active:scale-90",
                      on ? "bg-white text-brand-950" : "text-white/60 ring-1 ring-white/20 group-hover:bg-white group-hover:text-brand-950"
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
