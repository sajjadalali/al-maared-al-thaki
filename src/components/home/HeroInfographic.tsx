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
// down it, stops at each stop (which glows, and its number fills), and drives
// off the bottom to start again; the road behind it takes the stops' colours.
// Pointing at a stop (or tapping it) sends the light there. It runs only while
// the road is on screen, and not at all when the device asks for less motion.
const INTRO_MS = 1500;
const SPEED = 170; // px a second along the road
const DWELL_MS = [2300, 2600, 2900, 3600];
const intro = (y: number) => Math.round((INTRO_MS * (y + 30)) / 760);

function useRoadTrip() {
  const road = useRef<SVGPathElement>(null);
  const lit = useRef<SVGGElement>(null);
  const light = useRef<SVGGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const wanted = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const path = road.current;
    const trail = lit.current;
    const dot = light.current;
    const box = root.current;
    if (!path || !trail || !dot || !box) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const total = path.getTotalLength();
    // Where along the road each stop is, and where the road comes on screen.
    const at = STOPS.map(() => ({ len: 0, d: Infinity }));
    let start = 0;
    for (let len = 0; len <= total; len += 1) {
      const p = path.getPointAtLength(len);
      if (!start && p.y >= 4) start = len;
      STOPS.forEach((stop, i) => {
        const d = Math.hypot(p.x - stop.x, p.y - stop.y);
        if (d < at[i].d) at[i] = { len, d };
      });
    }
    const stopLen = at.map((a) => a.len);
    const trails = [...trail.querySelectorAll("path")];

    const place = (len: number) => {
      const p = path.getPointAtLength(len);
      dot.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      const offset = String(1000 - (1000 * len) / total);
      for (const t of trails) t.style.strokeDashoffset = offset;
    };
    const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

    let pos = start;
    let from = pos;
    let to = stopLen[0];
    let target = 0; // the stop it is driving to; STOPS.length = off the bottom
    let standing: number | null = null; // the stop it is standing at
    let mode: "move" | "dwell" | "reset" = "move";
    let t0 = performance.now() + INTRO_MS;
    let duration = 1;
    let until = 0;
    let raf = 0;
    let pausedAt = 0;

    const go = (index: number, now: number) => {
      target = index;
      from = pos;
      to = index === STOPS.length ? total : stopLen[index];
      duration = Math.max(650, (Math.abs(to - from) / SPEED) * 1000);
      t0 = now;
      mode = "move";
      if (standing !== null) {
        standing = null;
        setActive(null);
      }
    };

    place(pos);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const want = wanted.current;
      if (want !== null && mode !== "reset" && want !== standing && !(mode === "move" && target === want)) go(want, now);

      if (mode === "move") {
        if (now < t0) return;
        const k = Math.min(1, (now - t0) / duration);
        pos = from + (to - from) * ease(k);
        place(pos);
        if (k < 1) return;
        if (target === STOPS.length) {
          // Off the bottom: fade, then start again from the top.
          mode = "reset";
          box.dataset.roadReset = "";
          until = now + 600;
          return;
        }
        mode = "dwell";
        standing = target;
        setActive(target);
        until = now + DWELL_MS[target];
      } else if (mode === "dwell") {
        if (wanted.current === standing) until = Math.max(until, now + 700);
        if (now >= until && standing !== null) go(standing + 1, now);
      } else if (now >= until) {
        pos = start;
        place(pos);
        delete box.dataset.roadReset;
        go(0, now + 500);
      }
    };

    // Only while the road is on screen.
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !raf) {
        const gap = pausedAt ? performance.now() - pausedAt : 0;
        t0 += gap;
        until += gap;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        pausedAt = performance.now();
      }
    });
    seen.observe(box);
    // The light and its trail appear once the road has unrolled.
    const shown = setTimeout(() => (box.dataset.roadLive = ""), INTRO_MS - 300);
    return () => {
      clearTimeout(shown);
      seen.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  /** Send the light to a stop: while pointed at, or for a while after a tap. */
  const point = (index: number | null, holdMs?: number) => {
    wanted.current = index;
    if (index !== null && holdMs)
      setTimeout(() => {
        if (wanted.current === index) wanted.current = null;
      }, holdMs);
  };

  return { road, lit, light, root, active, point };
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
  point,
  children,
}: {
  index: 0 | 1 | 2 | 3;
  icon: typeof Scale;
  title: string;
  text: string;
  active: boolean;
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
        className="hero-road-in absolute left-0 -translate-y-[30px]"
        style={{ top: stop.y, right: 142, ...delay }}
        onPointerEnter={(e) => e.pointerType === "mouse" && point(index)}
        onPointerLeave={(e) => e.pointerType === "mouse" && point(null)}
        onClick={() => point(index, 3500)}
      >
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

  const { road, lit, light, root, active, point } = useRoadTrip();
  const stop = (index: 0 | 1 | 2 | 3) => ({ index, active: active === index, point });

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
