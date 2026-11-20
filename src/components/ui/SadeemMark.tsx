import { cn } from "@/lib/cn";

/*
 * Sadeem's mark (20 Nov 2026), replacing the robot mascot: the name in Ruqaa
 * calligraphy inside a chat bubble. The meem's tail is the bubble's tail: the
 * thin line leaves its tip, runs round the word and goes back into the meem's
 * shoulder. The ya's dots are three typing dots in amber, Sadeem's spark.
 * Letters: Aref Ruqaa Bold (SIL OFL), as paths, so no font has to load.
 *
 * Colours are set here and never inherited: the mark sits on white avatars
 * inside the dark chat header, where the inherited text colour is white and
 * would make it vanish. Use tone="light" only when drawing it straight on a
 * dark band, with no white circle under it.
 */

// The whole name: seen-dal, ya-meem (the ya's own dots are left out).
const WORD = [
  "M475 -458Q480 -487 464 -499Q448 -511 415 -511Q411 -511 409.5 -511Q408 -511 404 -511Q377 -511 360 -506Q342 -504 329 -490Q322 -483 315 -472Q308 -461 301 -446L267 -370Q238 -361 208 -353Q178 -345 150 -335Q111 -322 83 -306.5Q55 -291 33 -258Q16 -218 4 -167Q-8 -116 -8 -60Q-7 -4 -0.5 46Q6 96 17 143Q28 189 37.5 237.5Q47 286 54 337Q55 347 64.5 347Q74 347 77 339Q86 308 90 276.5Q94 245 94 211Q94 194 93 176.5Q92 159 90 143L50 -110Q49 -113 49 -116Q49 -118 49 -119.5Q49 -121 49 -122Q49 -137 58 -146Q84 -169 119.5 -184Q155 -199 195 -207Q261 -221 319.5 -251.5Q378 -282 416 -324Q439 -350 452.5 -383.5Q466 -417 475 -458Z",
  "M574 -555 595 -556Q603 -577 612 -597Q621 -617 631 -640Q636 -651 639.5 -663Q643 -675 643 -688Q643 -716 621 -729Q595 -745 565 -745Q551 -745 539 -741Q527 -737 516 -732Q464 -704 425.5 -656Q387 -608 359 -555Q347 -533 336 -511Q325 -489 315 -469Q313 -464 305.5 -448Q298 -432 295.5 -418Q293 -404 306 -404H323Q331 -404 333 -409Q346 -429 359 -448.5Q372 -468 386 -489V-488Q403 -511 420 -531Q437 -551 455 -567Q463 -575 472.5 -580.5Q482 -586 490 -590Q520 -604 539 -597Q558 -590 574 -555Z",
  "M1034 -182Q1022 -182 1013 -173Q996 -158 972 -153Q939 -148 900 -143Q861 -138 826 -136Q789 -134 750.5 -128Q712 -122 680 -114Q673 -112 667.5 -107.5Q662 -103 662 -95Q662 -88 668 -82Q674 -77 693.5 -67Q713 -57 744 -43Q780 -28 815 -14Q850 0 893 0Q914 0 928.5 -4.5Q943 -9 957 -19Q974 -31 987 -49.5Q1000 -68 1013.5 -87.5Q1027 -107 1043 -119Q1062 -127 1062 -154Q1062 -165 1055 -173.5Q1048 -182 1034 -182Z",
  "M1076 -260Q1076 -268 1074.5 -270.5Q1073 -273 1064 -273Q1057 -273 1050 -265Q1034 -243 1023 -215Q1012 -187 1005 -155Q1002 -140 1002 -129Q1002 -93 1025.5 -70.5Q1049 -48 1091 -48Q1102 -48 1138 -52Q1174 -56 1235 -65Q1264 -70 1299 -77.5Q1334 -85 1374 -98Q1415 -111 1462 -127.5Q1509 -144 1563 -165Q1559 -157 1553.5 -143Q1548 -129 1547 -115.5Q1546 -102 1555 -94Q1581 -76 1594 -106Q1619 -159 1642.5 -216.5Q1666 -274 1685 -332Q1687 -340 1676.5 -348Q1666 -356 1660 -350Q1650 -335 1634.5 -325Q1619 -315 1601 -308Q1492 -263 1372 -233.5Q1252 -204 1115 -196Q1106 -198 1100 -199Q1090 -202 1082 -215Q1074 -228 1074 -244Q1074 -248 1075 -252Q1076 -256 1076 -260Z",
];
// The compact mark keeps the ya-meem only, for avatars under ~32px.
const YA_MEEM = [
  "M475 -458Q480 -487 464 -499Q448 -511 415 -511Q411 -511 409.5 -511Q408 -511 404 -511Q377 -511 360 -506Q342 -504 329 -490Q322 -483 315 -472Q308 -461 301 -446L267 -370Q238 -361 208 -353Q178 -345 150 -335Q111 -322 83 -306.5Q55 -291 33 -258Q16 -218 4 -167Q-8 -116 -8 -60Q-7 -4 -0.5 46Q6 96 17 143Q28 189 37.5 237.5Q47 286 54 337Q55 347 64.5 347Q74 347 77 339Q86 308 90 276.5Q94 245 94 211Q94 194 93 176.5Q92 159 90 143L50 -110Q49 -113 49 -116Q49 -118 49 -119.5Q49 -121 49 -122Q49 -137 58 -146Q84 -169 119.5 -184Q155 -199 195 -207Q261 -221 319.5 -251.5Q378 -282 416 -324Q439 -350 452.5 -383.5Q466 -417 475 -458Z",
  "M574 -555 595 -556Q603 -577 612 -597Q621 -617 631 -640Q636 -651 639.5 -663Q643 -675 643 -688Q643 -716 621 -729Q595 -745 565 -745Q551 -745 539 -741Q527 -737 516 -732Q464 -704 425.5 -656Q387 -608 359 -555Q347 -533 336 -511Q325 -489 315 -469Q313 -464 305.5 -448Q298 -432 295.5 -418Q293 -404 306 -404H323Q331 -404 333 -409Q346 -429 359 -448.5Q372 -468 386 -489V-488Q403 -511 420 -531Q437 -551 455 -567Q463 -575 472.5 -580.5Q482 -586 490 -590Q520 -604 539 -597Q558 -590 574 -555Z",
];

const BUBBLE = "M 60 280 C 66 350 84 392 128 388 C 178 383 196 262 300 214 C 330 203 360 200 400 200 L 1590 200 C 1760 200 1830 130 1830 -40 L 1830 -580 C 1830 -750 1760 -820 1590 -820 L 170 -820 C 0 -820 -70 -750 -70 -580 L -70 -330 C -70 -250 -40 -200 10 -170";
const BUBBLE_COMPACT = "M 60 280 C 66 350 84 392 128 388 C 178 383 196 262 300 214 C 330 203 360 200 400 200 L 790 200 C 960 200 1030 130 1030 -40 L 1030 -580 C 1030 -750 960 -820 790 -820 L 170 -820 C 0 -820 -70 -750 -70 -580 L -70 -330 C -70 -250 -40 -200 10 -170";

// Right to left, as Arabic types: the big dot first.
const DOTS = [
  { cx: 850, r: 50 },
  { cx: 733, r: 40 },
  { cx: 635, r: 30 },
];
const DOTS_COMPACT = [
  { cx: 880, r: 58 },
  { cx: 752, r: 46 },
  { cx: 648, r: 36 },
];

const TONES = {
  ink: { ink: "text-brand-950", spark: "fill-accent-500" },
  light: { ink: "text-white", spark: "fill-accent-400" },
} as const;

export function SadeemMark({
  className,
  tone = "ink",
  compact = false,
  animated = false,
  line = 1.4,
  title,
}: {
  className?: string;
  tone?: keyof typeof TONES;
  /** The ya-meem and its bubble only: clearer than the whole word under ~32px. */
  compact?: boolean;
  /** The dots move like Sadeem typing (still for reduced motion). */
  animated?: boolean;
  /** The bubble's line in screen pixels, the same at every size (at avatar
      sizes a line that scales with the mark thins to a hair). Raise it for big uses. */
  line?: number;
  /** Give it when the mark stands alone; otherwise it is hidden from screen readers. */
  title?: string;
}) {
  const t = TONES[tone];
  const dots = compact ? DOTS_COMPACT : DOTS;
  return (
    <svg
      viewBox={compact ? "-98 -848 1156 1264" : "-92 -842 1944 1252"}
      className={cn("shrink-0", t.ink, className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="currentColor">
        {(compact ? YA_MEEM : WORD).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path
        d={compact ? BUBBLE_COMPACT : BUBBLE}
        fill="none"
        stroke="currentColor"
        strokeWidth={line}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={cn("transition-colors duration-300", t.spark, animated && "sadeem-dots")}>
        {dots.map((dot, i) => (
          <circle key={dot.cx} cx={dot.cx} cy={-395} r={dot.r} style={animated ? { animationDelay: `${i * 0.15}s` } : undefined} />
        ))}
      </g>
    </svg>
  );
}
