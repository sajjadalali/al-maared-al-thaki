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
  { y: 536, x: 84, color: "#2ec27e" }, // green: the right car
] as const;

function Road() {
  const path = "M66 -30C66 10 48 24 48 58S84 150 84 196S46 314 46 362S84 486 84 536S66 650 66 760";
  return (
    <svg viewBox="0 0 130 700" className="absolute inset-y-0 right-0 h-full w-[130px] [mask-image:linear-gradient(to_bottom,transparent,black_9%,black_91%,transparent)]" aria-hidden>
      {/* the tarmac, its edges, and the dashes down the middle */}
      <path d={path} fill="none" stroke="#31476b" strokeWidth="50" />
      <path d={path} fill="none" stroke="#18263f" strokeWidth="45" />
      <path d={path} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="11 13" />
      {STOPS.map((stop, i) => (
        <g key={i}>
          <circle cx={stop.x} cy={stop.y} r="34" fill={stop.color} opacity="0.2" />
          <circle cx={stop.x} cy={stop.y} r="25" fill={stop.color} stroke="#0b1322" strokeWidth="4" />
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
  children,
}: {
  index: 0 | 1 | 2 | 3;
  icon: typeof Scale;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  const stop = STOPS[index];
  return (
    <>
      <Icon
        aria-hidden
        strokeWidth={2.4}
        className="absolute h-[22px] w-[22px] -translate-y-1/2 translate-x-1/2 text-brand-950"
        style={{ top: stop.y, right: 130 - stop.x }}
      />
      <li className="absolute left-0 -translate-y-[30px]" style={{ top: stop.y, right: 142 }}>
        <p className="flex items-baseline gap-2 text-[20px] font-bold leading-8 text-white">
          <span className="text-[15px] font-bold" style={{ color: stop.color }}>
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

  return (
    <div className="relative mx-auto h-[700px] w-full max-w-[500px]">
      {/* one soft light behind the road, so the colours sit on something */}
      <div aria-hidden className="pointer-events-none absolute -inset-32 bg-[radial-gradient(closest-side,rgba(79,179,255,0.14),transparent)]" />
      <Road />
      <ol className="contents">
        <Stop index={0} icon={CircleHelp} title="دايخ وتدوّر على سيارة؟" text="سيارات هواي وما تعرف يا هي تناسبك" />
        <Stop index={1} icon={MessageCircle} title="احچي ويا سديم" text="گلّه شنو تريد وشكد ميزانيتك">
          <span className="inline-block rounded-[18px] rounded-tr-md bg-white px-3.5 py-2 text-[13.5px] font-semibold leading-6 text-brand-950">
            أريد <bdi>SUV</bdi> بحدود 40 مليون
          </span>
        </Stop>
        <Stop index={2} icon={Scale} title="يجيبلك، يقارن ويحلل" text={`${stock}، ويگلك الفرق`}>
          <span className="flex gap-2">
            <MiniCar bodyType="سيدان" color="فضي" />
            <MiniCar bodyType="SUV" color="أحمر" picked />
            <MiniCar bodyType="دفع رباعي" color="أبيض" />
          </span>
        </Stop>
        <Stop index={3} icon={KeyRound} title="تاخذ سيارتك المناسبة" text="سديم وياك لحد ما تختار">
          {/* the stop's picture: the car that turned out to be the one */}
          <span className="relative block w-[min(100%,230px)]">
            <CarArt bodyType="SUV" color="أحمر" className="w-full" />
            <span className="absolute -top-1 left-0 inline-flex items-center gap-1.5 rounded-full bg-[#2ec27e] py-1 pe-3.5 ps-1 text-[12.5px] font-bold leading-6 text-brand-950 shadow-[0_8px_20px_-6px_rgba(46,194,126,0.8)]">
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
