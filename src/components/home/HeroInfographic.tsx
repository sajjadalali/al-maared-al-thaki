"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleHelp, KeyRound, MessageCircle, Scale } from "lucide-react";
import { CarArt } from "@/components/ui/CarArt";
import { carCount } from "@/lib/format";
import { cn } from "@/lib/cn";

// The idea of the showroom as a road with four stops, in the showroom's own
// dialect: looking for a car wears you out; you talk to Sadeem; he brings what
// suits you, compares and explains; you end up with the right car. Each stop
// has its own colour and a small picture. The numbers are the stock's own.

const STOPS = [
  { y: 58, x: 48, color: "#ff7a66" }, // coral: the trouble
  { y: 196, x: 84, color: "#f6a723" }, // amber: the buyer's words
  { y: 362, x: 46, color: "#4fb3ff" }, // sky: Sadeem's search and comparison
  { y: 528, x: 84, color: "#2ec27e" }, // green: the right car
] as const;

const ROAD = "M66 -30C66 10 48 24 48 58S84 150 84 196S46 314 46 362S84 486 84 536S66 650 66 760";

// The road's motion (19 Nov). On load the road unrolls from the top and the
// stops light up as it reaches them (CSS, .hero-road-*). Then a light drives
// down it on its own: it rests at each stop (which glows, and its number
// fills), and drives off the bottom to start again; the road behind it takes
// the stops' colours. Once the visitor scrolls, the light follows the scroll
// instead: down as the page goes down, back up as it goes up, gliding rather
// than jumping. Back at the top of the page, it drives on its own again.
// Pointing at a stop, tapping it or tabbing to it picks it: the light glides
// there, the stop's text gets a soft panel and the others step back. It runs
// only while the road is on screen, and not at all when the device asks for
// less motion.
const INTRO_MS = 1500;
const SPEED = 170; // px a second along the road, driving on its own
const DWELL_MS = [2300, 2600, 2900, 3600];
const intro = (y: number) => Math.round((INTRO_MS * (y + 30)) / 760);
// Following the scroll or a picked stop: how quickly the light catches up (ms).
const GLIDE_SCROLL = 140;
const GLIDE_PICK = 220;
// Where the light sits when following the scroll: from just under the top of
// the road to below the last stop.
const Y_TOP = 6;
const Y_END = 640;
// The line on the screen the light keeps level with (share of its height).
const EYE_LINE = 0.6;

function useRoadTrip() {
  const road = useRef<SVGPathElement>(null);
  const lit = useRef<SVGGElement>(null);
  const light = useRef<SVGGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const wanted = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const path = road.current;
    const trail = lit.current;
    const dot = light.current;
    const box = root.current;
    if (!path || !trail || !dot || !box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The road, measured once: where each stop is along it, and for every
    // height on it, how far along the road that is.
    const total = path.getTotalLength();
    const at = STOPS.map(() => ({ len: 0, d: Infinity }));
    const lenAtY: number[] = [];
    let start = 0;
    for (let len = 0; len <= total; len += 1) {
      const p = path.getPointAtLength(len);
      if (!start && p.y >= 4) start = len;
      const y = Math.round(p.y);
      if (y >= 0 && y <= 760 && lenAtY[y] === undefined) lenAtY[y] = len;
      STOPS.forEach((stop, i) => {
        const d = Math.hypot(p.x - stop.x, p.y - stop.y);
        if (d < at[i].d) at[i] = { len, d };
      });
    }
    for (let y = 1; y <= 760; y++) if (lenAtY[y] === undefined) lenAtY[y] = lenAtY[y - 1] ?? 0;
    const stopLen = at.map((a) => a.len);
    const trails = [...trail.querySelectorAll("path")];

    const place = (len: number) => {
      const p = path.getPointAtLength(len);
      dot.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      const offset = String(1000 - (1000 * len) / total);
      for (const t of trails) t.style.strokeDashoffset = offset;
    };
    const yOf = (len: number) => path.getPointAtLength(len).y;
    const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
    let shown: number | null = null;
    const show = (index: number | null) => {
      if (index !== shown) setActive((shown = index));
    };
    // The stop the light is at, if any (within a few px along the road).
    const stopNear = (len: number) => {
      const i = stopLen.findIndex((l) => Math.abs(l - len) < 12);
      return i === -1 ? null : i;
    };

    // Driving on its own.
    let mode: "auto" | "scroll" = "auto";
    let pos = start;
    let from = pos;
    let to = stopLen[0];
    let target = 0; // the stop it is driving to; STOPS.length = off the bottom
    let standing: number | null = null; // the stop it is resting at
    let phase: "move" | "dwell" | "reset" = "move";
    let t0 = performance.now() + INTRO_MS;
    let duration = 1;
    let until = 0;

    const go = (index: number, now: number) => {
      target = index;
      from = pos;
      to = index === STOPS.length ? total : stopLen[index];
      duration = Math.max(650, (Math.abs(to - from) / SPEED) * 1000);
      t0 = now;
      phase = "move";
      standing = null;
      show(null);
    };
    const nextStopAfter = (len: number) => {
      const i = stopLen.findIndex((l) => l > len + 12);
      return i === -1 ? STOPS.length : i;
    };
    const resumeAuto = (now: number) => {
      mode = "auto";
      const here = stopNear(pos);
      if (here !== null) {
        standing = here;
        phase = "dwell";
        until = now + 1400;
        show(here);
      } else go(nextStopAfter(pos), now);
    };

    // Following the scroll. s0 and s1: the scroll at which the light is at the
    // top of the road and at its bottom, keeping level with the eye line.
    // Where the road starts below the eye line (phones: it comes up from under
    // the hero's text), the light simply keeps level with it. Where the page
    // opens with the road already in view (computers), scrolling from where the
    // light was carries it on from there, so it never jumps back.
    let s0 = 0;
    let s1 = 1;
    let level = false;
    const measure = () => {
      const roadTop = box.getBoundingClientRect().top + window.scrollY;
      const eye = window.innerHeight * EYE_LINE;
      s0 = Math.max(0, roadTop + Y_TOP - eye);
      s1 = Math.max(s0 + 200, roadTop + Y_END - eye);
      level = s0 > 0;
    };
    measure();
    // Where scrolling took over: the scroll then, and how far down the light
    // was, so it carries on from there instead of jumping.
    let anchorScroll = 0;
    let anchorP = 0;
    const scrollTarget = () => {
      const s = window.scrollY;
      let p: number;
      if (level) p = Math.min(1, Math.max(0, (s - s0) / (s1 - s0)));
      else if (s >= anchorScroll) p = anchorP + (1 - anchorP) * Math.min(1, (s - anchorScroll) / Math.max(120, s1 - anchorScroll));
      else {
        const low = Math.min(s0, Math.max(0, anchorScroll - 400));
        p = anchorP * Math.max(0, (s - low) / Math.max(60, anchorScroll - low));
      }
      return lenAtY[Math.round(Y_TOP + p * (Y_END - Y_TOP))];
    };
    const takeScroll = () => {
      if (box.dataset.roadReset !== undefined) {
        delete box.dataset.roadReset;
        pos = start;
        place(pos);
      }
      mode = "scroll";
      anchorScroll = window.scrollY;
      anchorP = Math.min(1, Math.max(0, (yOf(pos) - Y_TOP) / (Y_END - Y_TOP)));
    };

    const baseline = window.scrollY;
    let scrolledAt = 0;
    const onScroll = () => {
      scrolledAt = performance.now();
      if (mode === "auto" && Math.abs(window.scrollY - baseline) > 4 && wanted.current === null) takeScroll();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    // A picked stop: the light glides to it while it is picked.
    let following: number | null = null;

    let last = performance.now();
    let raf = 0;
    place(pos);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - last);
      last = now;
      const glide = (goal: number, ms: number) => {
        pos += (goal - pos) * (1 - Math.exp(-dt / ms));
        if (Math.abs(goal - pos) < 0.3) pos = goal;
        place(pos);
        show(stopNear(pos));
      };

      const want = wanted.current;
      if (want !== null) {
        if (box.dataset.roadReset !== undefined) return;
        following = want;
        glide(stopLen[want], GLIDE_PICK);
        return;
      }
      if (following !== null) {
        // Let go of a picked stop: carry on from here.
        following = null;
        if (mode === "scroll") takeScroll();
        else resumeAuto(now);
      }

      if (mode === "scroll") {
        glide(scrollTarget(), GLIDE_SCROLL);
        // Back at the top of the page and still for a while: drive on its own.
        if (!level && window.scrollY <= 2 && now - scrolledAt > 2500 && yOf(pos) <= Y_TOP + 4) resumeAuto(now);
        return;
      }

      if (phase === "move") {
        if (now < t0) return;
        const k = Math.min(1, (now - t0) / duration);
        pos = from + (to - from) * ease(k);
        place(pos);
        if (k < 1) return;
        if (target === STOPS.length) {
          // Off the bottom: fade, then start again from the top.
          phase = "reset";
          box.dataset.roadReset = "";
          until = now + 600;
          return;
        }
        phase = "dwell";
        standing = target;
        show(target);
        until = now + DWELL_MS[target];
      } else if (phase === "dwell") {
        if (now >= until && standing !== null) go(standing + 1, now);
      } else if (now >= until) {
        pos = start;
        place(pos);
        delete box.dataset.roadReset;
        go(0, now + 500);
      }
    };

    // Only while a good part of the road is on screen (on a phone the page
    // opens with just its top showing under the text: it waits for the scroll).
    let pausedAt = 0;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !raf) {
          const gap = pausedAt ? performance.now() - pausedAt : 0;
          t0 += gap;
          until += gap;
          last = performance.now();
          measure();
          raf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
          pausedAt = performance.now();
        }
      },
      { threshold: 0.3 }
    );
    seen.observe(box);
    // The light and its trail appear once the road has unrolled.
    const appear = setTimeout(() => (box.dataset.roadLive = ""), INTRO_MS - 300);
    return () => {
      clearTimeout(appear);
      seen.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /**
   * Picks a stop (or lets go, with null). A tap holds it for a few seconds;
   * the mouse and the keyboard hold it while they are on it.
   */
  const point = (index: number | null, holdMs?: number) => {
    clearTimeout(holdTimer.current);
    wanted.current = index;
    setPicked(index);
    if (index !== null && holdMs)
      holdTimer.current = setTimeout(() => {
        wanted.current = null;
        setPicked(null);
      }, holdMs);
  };

  return { road, lit, light, root, active, picked, point };
}

function Road({
  road,
  lit,
  light,
  active,
}: {
  road: React.RefObject<SVGPathElement | null>;
  lit: React.RefObject<SVGGElement | null>;
  light: React.RefObject<SVGGElement | null>;
  active: number | null;
}) {
  return (
    <svg viewBox="0 0 130 700" className="absolute inset-y-0 right-0 h-full w-[130px] [mask-image:linear-gradient(to_bottom,transparent,black_9%,black_91%,transparent)]" aria-hidden>
      <defs>
        <clipPath id="hero-road-reveal">
          <rect className="hero-road-reveal" x="-40" y="-40" width="210" height="820" />
        </clipPath>
        {/* the road behind the light, in the colour of the stop it last passed */}
        <linearGradient id="hero-road-lit" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="700">
          {STOPS.map((stop) => (
            <stop key={stop.y} offset={stop.y / 700} stopColor={stop.color} />
          ))}
        </linearGradient>
        <radialGradient id="hero-road-light">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath="url(#hero-road-reveal)">
        {/* the tarmac, its edges, and the dashes down the middle */}
        <path ref={road} d={ROAD} fill="none" stroke="#31476b" strokeWidth="50" />
        <path d={ROAD} fill="none" stroke="#18263f" strokeWidth="45" />
        <path d={ROAD} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="11 13" />
      </g>
      <g ref={lit} className="hero-road-trip">
        <path d={ROAD} pathLength={1000} fill="none" stroke="url(#hero-road-lit)" strokeOpacity="0.28" strokeWidth="11" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset="1000" />
        <path d={ROAD} pathLength={1000} fill="none" stroke="url(#hero-road-lit)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset="1000" />
      </g>
      <g ref={light} className="hero-road-trip" transform="translate(66 -30)">
        <circle r="15" fill="url(#hero-road-light)" />
        <circle r="4.5" fill="#ffffff" />
      </g>
      {STOPS.map((stop, i) => (
        <g key={i} className="hero-road-stop" data-active={active === i ? "" : undefined} style={{ animationDelay: `${intro(stop.y)}ms` }}>
          <circle className="hero-road-ring" cx={stop.x} cy={stop.y} r="27" fill="none" stroke={stop.color} strokeWidth="3" />
          <circle cx={stop.x} cy={stop.y} r="34" fill={stop.color} opacity="0.2" />
          <circle className="hero-road-dot" cx={stop.x} cy={stop.y} r="25" fill={stop.color} stroke="#0b1322" strokeWidth="4" />
        </g>
      ))}
    </svg>
  );
}

function Stop({
  index,
  icon: Icon,
  title,
  text,
  active,
  picked,
  dimmed,
  point,
  children,
}: {
  index: 0 | 1 | 2 | 3;
  icon: typeof Scale;
  title: string;
  text: string;
  /** The light is at this stop. */
  active: boolean;
  /** The visitor picked this stop. */
  picked: boolean;
  /** The visitor picked another stop. */
  dimmed: boolean;
  point: (index: number | null, holdMs?: number) => void;
  children?: React.ReactNode;
}) {
  const stop = STOPS[index];
  const delay = { animationDelay: `${intro(stop.y) + 120}ms` };
  return (
    <>
      <Icon
        aria-hidden
        strokeWidth={2.4}
        className="hero-road-in pointer-events-none absolute h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 text-brand-950"
        style={{ top: stop.y, right: 130 - stop.x, ...delay }}
      />
      <li
        tabIndex={0}
        className="hero-road-in absolute left-0 isolate -translate-y-[30px] cursor-pointer outline-none"
        style={{ top: stop.y, right: 142, ...delay }}
        onPointerEnter={(e) => e.pointerType === "mouse" && point(index)}
        onPointerLeave={(e) => e.pointerType === "mouse" && point(null)}
        onClick={() => point(index, 4000)}
        onFocus={() => point(index)}
        onBlur={() => point(null)}
      >
        {/* The picked stop's panel: faint glass, its colour on the road's side. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-y-2.5 -left-2 -right-3.5 -z-10 rounded-2xl ring-1 sm:-left-3.5 transition-[opacity,scale] duration-300 ease-out",
            picked ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
          )}
          style={{
            backgroundImage: `linear-gradient(to left, ${stop.color}26, ${stop.color}0a 45%, rgb(255 255 255 / 0.03))`,
            ["--tw-ring-color" as string]: `${stop.color}40`,
          }}
        />
        {/* The other stops step back while one is picked. */}
        <div className={cn("transition-opacity duration-300", dimmed ? "opacity-40" : "opacity-100")}>
          <p className="flex items-baseline gap-2 text-[20px] font-bold leading-8 text-white">
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center self-center rounded-full text-[14px] font-bold transition-[background-color,color] duration-300"
              style={active ? { backgroundColor: stop.color, color: "#0b1322" } : { color: stop.color }}
            >
              {index + 1}
            </span>
            {title}
          </p>
          <p className="text-[13.5px] leading-6 text-white/60">{text}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </li>
    </>
  );
}

/** A small car on a tile; the picked one is lit. */
function MiniCar({ bodyType, color, picked }: { bodyType: string; color: string; picked?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex h-[60px] w-[calc((100%-1rem)/3)] max-w-[104px] items-center justify-center rounded-2xl",
        picked ? "bg-white shadow-[0_10px_24px_-10px_rgba(79,179,255,0.9)] ring-2 ring-[#4fb3ff]" : "bg-white/[0.07] ring-1 ring-white/10"
      )}
    >
      <CarArt bodyType={bodyType} color={color} className={cn("w-[80%]", !picked && "opacity-60")} />
      {picked && (
        <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4fb3ff] text-brand-950">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
      )}
    </span>
  );
}

export function HeroInfographic({ available, brands }: { available: number; brands: number }) {
  const stock = [
    `من ${carCount(available)}`,
    brands >= 3 && brands <= 10 ? `و${brands} ماركات` : brands > 10 ? `و${brands} ماركة` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const { road, lit, light, root, active, picked, point } = useRoadTrip();
  const stop = (index: 0 | 1 | 2 | 3) => ({
    index,
    active: active === index,
    picked: picked === index,
    dimmed: picked !== null && picked !== index,
    point,
  });

  return (
    <div ref={root} className="hero-road relative mx-auto h-[700px] w-full max-w-[500px]">
      {/* one soft light behind the road, so the colours sit on something */}
      <div aria-hidden className="pointer-events-none absolute -inset-32 bg-[radial-gradient(closest-side,rgba(79,179,255,0.14),transparent)]" />
      <Road road={road} lit={lit} light={light} active={active} />
      <ol className="contents">
        <Stop {...stop(0)} icon={CircleHelp} title="دايخ وتدوّر على سيارة؟" text="سيارات هواي وما تعرف يا هي تناسبك" />
        <Stop {...stop(1)} icon={MessageCircle} title="احچي ويا سديم" text="گلّه شنو تريد وشكد ميزانيتك">
          <span className="inline-block rounded-[18px] rounded-tr-md bg-white px-3.5 py-2 text-[13.5px] font-semibold leading-6 text-brand-950">
            أريد <bdi>SUV</bdi> بحدود 40 مليون
          </span>
        </Stop>
        <Stop {...stop(2)} icon={Scale} title="يجيبلك، يقارن ويحلل" text={`${stock}، ويگلك الفرق`}>
          <span className="flex gap-2">
            <MiniCar bodyType="سيدان" color="فضي" />
            <MiniCar bodyType="دفع رباعي" color="#5f7f63" picked />
            <MiniCar bodyType="SUV" color="#2f7fd6" />
          </span>
        </Stop>
        <Stop {...stop(3)} icon={KeyRound} title="تاخذ سيارتك المناسبة" text="سديم وياك لحد ما تختار">
          {/* the stop's picture: the car that turned out to be the one */}
          <span className="relative block mt-7 w-[min(100%,240px)]">
            <CarArt bodyType="دفع رباعي" color="#5f7f63" className="w-full" />
            <span className="absolute -top-5 left-0 inline-flex items-center gap-1.5 rounded-full bg-[#2ec27e] py-1 pe-3.5 ps-1 text-[12.5px] font-bold leading-6 text-brand-950 shadow-[0_8px_20px_-6px_rgba(46,194,126,0.8)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-950 text-[#2ec27e]">
                <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
              </span>
              هاي سيارتك
            </span>
          </span>
        </Stop>
      </ol>
    </div>
  );
}
