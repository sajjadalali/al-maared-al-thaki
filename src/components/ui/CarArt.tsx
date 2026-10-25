import { useId, type SVGProps } from "react";

// Side-view drawings per body type, facing left (forward in RTL). They stand in
// for a photo until the showroom adds real ones, so the card still shows the
// car's shape and colour instead of an empty box.

interface Shape {
  /** Outline from the front of the sill, over the roof, to the rear of the sill. */
  top: string;
  /** y of the sill line, where the wheel arches open */
  sill: number;
  /** x where the nose meets the sill (the front intake sits there) */
  nose: number;
  windows: string[];
  wheels: [number, number];
  wheelY: number;
  wheelR: number;
  archR: number;
  /** dark plastic trim on the arches and sill, the SUV / 4x4 tell */
  cladding?: boolean;
  belt: string;
  seams: string[];
  handles: [number, number][];
  headlight: string;
  taillight: string;
  mirror: string;
  extra?: string;
}

const SHAPES: Record<string, Shape> = {
  sedan: {
    top: "M32 152C24 150 21 141 22 131C23 120 29 112 44 109L150 96C166 94 180 89 194 80L240 56C248 51 256 49 268 49L334 49C348 49 357 53 367 61L402 86C420 88 440 90 452 94C460 98 463 108 461 120C460 132 459 143 453 152",
    sill: 152,
    nose: 22,
    windows: [
      "M207 85L246 61C253 57 260 55 270 55L298 55L298 87Z",
      "M306 55L332 55C343 55 351 58 359 64L389 87L306 87Z",
    ],
    wheels: [105, 365],
    wheelY: 148,
    wheelR: 30,
    archR: 38,
    belt: "M190 92C260 90 340 90 408 93",
    seams: ["M196 90C190 112 188 130 191 148", "M302 90L300 148", "M396 94C388 112 386 124 384 134"],
    handles: [[258, 101], [350, 101]],
    headlight: "M27 117C33 113 47 111 63 110L59 119C47 121 36 121 27 120Z",
    taillight: "M447 96C453 98 458 102 460 110L447 110Z",
    mirror: "M210 86C202 86 197 90 197 95L214 95L216 88Z",
  },
  hatchback: {
    top: "M50 152C42 150 39 141 40 131C41 120 47 113 62 110L150 99C166 96 180 90 194 81L236 58C244 53 252 51 264 51L346 51C360 51 368 56 374 64L398 94C406 104 410 116 410 128C410 140 408 148 402 152",
    sill: 152,
    nose: 40,
    windows: [
      "M206 86L242 63C249 59 256 57 266 57L294 57L294 88Z",
      "M302 57L344 57C354 57 360 61 365 67L384 89L302 88Z",
    ],
    wheels: [112, 340],
    wheelY: 148,
    wheelR: 30,
    archR: 38,
    belt: "M190 93C260 91 330 91 392 94",
    seams: ["M196 91C190 112 188 130 191 148", "M298 91L296 148", "M392 96C392 112 394 124 398 134"],
    handles: [[254, 102], [338, 102]],
    headlight: "M45 118C51 114 63 112 77 111L74 120C62 122 53 122 45 121Z",
    taillight: "M396 96C402 100 406 106 407 112L396 112Z",
    mirror: "M209 87C201 87 196 91 196 96L213 96L215 89Z",
  },
  suv: {
    top: "M34 142C25 140 22 132 23 120C24 106 28 94 42 89L144 80C160 78 174 72 188 62L224 42C232 37 240 35 252 35L382 35C396 35 404 38 412 46L438 76C450 88 456 102 456 116C456 128 455 136 449 142",
    sill: 142,
    nose: 23,
    windows: [
      "M203 71L230 48C237 43 244 41 254 41L296 41L296 75Z",
      "M304 41L370 41L370 75L304 75Z",
      "M378 41C389 41 396 44 402 50L424 76L378 75Z",
    ],
    wheels: [102, 364],
    wheelY: 142,
    wheelR: 33,
    archR: 41,
    cladding: true,
    belt: "M186 82C270 80 360 80 434 84",
    seams: ["M196 82C188 106 186 126 190 146", "M300 82L298 146", "M374 82C376 104 378 118 384 130"],
    handles: [[256, 94], [344, 94]],
    headlight: "M25 99C33 94 49 92 67 91L63 102C49 104 35 104 25 103Z",
    taillight: "M444 84C450 90 454 98 456 108L444 106Z",
    mirror: "M206 72C198 72 192 77 192 83L210 83L212 75Z",
    extra: "M248 31L388 31",
  },
  offroad: {
    top: "M30 140C24 139 22 132 22 124L22 92C22 86 26 82 34 81L150 76C160 75 168 72 174 66L204 34C208 30 214 28 222 28L408 28C418 28 424 32 427 40L446 76C452 88 454 100 454 112L454 128C454 135 452 139 448 140",
    sill: 140,
    nose: 21,
    windows: [
      "M188 68L210 40C214 36 219 34 226 34L288 34L288 70Z",
      "M296 34L364 34L364 70L296 70Z",
      "M372 34L408 34C415 34 419 37 422 43L436 70L372 70Z",
    ],
    wheels: [106, 362],
    wheelY: 140,
    wheelR: 35,
    archR: 44,
    cladding: true,
    belt: "M176 76C270 74 360 74 440 78",
    seams: [
      "M182 76C176 100 176 122 182 140",
      "M292 74L292 140",
      "M368 74L370 100",
    ],
    handles: [[250, 88], [334, 88]],
    headlight: "M23 96C30 92 46 90 62 89L60 101C46 103 32 103 23 102Z",
    taillight: "M446 80C450 86 452 94 453 104L445 104Z",
    mirror: "M192 70C184 70 178 75 178 81L196 81L198 73Z",
    extra: "M226 23L410 23",
  },
  pickup: {
    top: "M30 140C22 138 20 130 21 120C22 108 28 100 44 96L140 86C156 84 168 78 178 68L206 42C212 36 220 34 230 34L330 34C338 34 343 38 345 46L350 84L456 84C460 84 462 88 462 92L462 134C462 138 459 140 454 140",
    sill: 140,
    nose: 21,
    windows: [
      "M191 72L212 48C217 42 223 40 232 40L268 40L268 76Z",
      "M276 40L326 40C332 40 336 43 337 49L340 76L276 76Z",
    ],
    wheels: [106, 374],
    wheelY: 140,
    wheelR: 34,
    archR: 42,
    cladding: true,
    belt: "M178 84C230 82 300 82 348 84",
    seams: ["M186 82C180 104 180 124 186 144", "M272 82L272 144", "M346 84L346 144"],
    handles: [[232, 94], [306, 94]],
    headlight: "M25 106C33 101 48 99 64 98L61 110C48 112 35 112 25 111Z",
    taillight: "M455 90L461 90L461 112L455 112Z",
    mirror: "M194 73C186 73 180 78 180 84L198 84L200 76Z",
    extra: "M352 92L454 92",
  },
  coupe: {
    top: "M36 152C27 150 24 142 25 132C26 122 32 116 46 113L164 100C184 97 200 90 214 80L262 58C272 53 282 51 294 51L320 51C340 51 356 56 372 66L420 92C440 96 452 100 456 108C460 118 459 140 452 152",
    sill: 152,
    nose: 25,
    windows: ["M226 86L266 63C274 59 282 57 294 57L318 57C334 57 346 61 360 69L390 88Z"],
    wheels: [108, 360],
    wheelY: 148,
    wheelR: 30,
    archR: 38,
    belt: "M210 92C290 90 370 92 432 98",
    seams: ["M214 92C208 114 206 132 210 148", "M330 92C328 112 330 126 334 138"],
    handles: [[300, 102]],
    headlight: "M31 120C37 116 51 114 67 113L63 122C51 124 40 124 31 123Z",
    taillight: "M444 100C450 102 455 106 457 114L444 114Z",
    mirror: "M229 87C221 87 216 91 216 96L233 96L235 89Z",
  },
};

const BODY_TO_SHAPE: Record<string, keyof typeof SHAPES> = {
  سيدان: "sedan",
  هاتشباك: "hatchback",
  SUV: "suv",
  "دفع رباعي": "offroad",
  شاحنة: "pickup",
  كوبيه: "coupe",
};

// Paint colours for the names used in the Excel sheet. Unknown names fall back
// to a neutral silver rather than guessing.
const PAINT: Record<string, string> = {
  أبيض: "#f3f4f6",
  "أبيض لؤلؤي": "#eef0ec",
  لؤلؤي: "#eef0ec",
  أسود: "#1d2026",
  فضي: "#b7bcc4",
  رمادي: "#6b717c",
  "رمادي غامق": "#4a4f58",
  أحمر: "#b1261f",
  عنابي: "#6c1f2a",
  ماروني: "#6c1f2a",
  أزرق: "#234f8f",
  كحلي: "#1d2a48",
  "أزرق داكن": "#1d2a48",
  أخضر: "#2f5c46",
  زيتي: "#5b5e3f",
  بني: "#6a4a33",
  بيج: "#d6c6a5",
  ذهبي: "#c4a15d",
  برتقالي: "#d8651e",
  أصفر: "#e3b21c",
};

export function paintFor(color?: string): string {
  if (!color) return PAINT["فضي"];
  return PAINT[color.trim()] ?? PAINT[color.trim().split(" ")[0]] ?? PAINT["فضي"];
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

interface CarArtProps extends SVGProps<SVGSVGElement> {
  bodyType?: string;
  color?: string;
}

export function CarArt({ bodyType = "سيدان", color, ...props }: CarArtProps) {
  const uid = useId().replace(/:/g, "");
  const shape = SHAPES[BODY_TO_SHAPE[bodyType] ?? "sedan"];
  const paint = paintFor(color);
  const light = isLight(paint);
  const ids = {
    shade: `${uid}-shade`,
    glass: `${uid}-glass`,
    rim: `${uid}-rim`,
    shadow: `${uid}-shadow`,
    clip: `${uid}-clip`,
  };
  const line = light ? "rgba(15,23,42,.22)" : "rgba(0,0,0,.35)";
  const groundY = shape.wheelY + shape.wheelR;
  const { sill, archR } = shape;
  const [front, rear] = shape.wheels;
  const arch = (cx: number) => `L${cx + archR} ${sill}A${archR} ${archR} 0 0 0 ${cx - archR} ${sill}`;
  const body = `${shape.top}${arch(rear)}${arch(front)}Z`;
  const well = (cx: number) => `M${cx - archR} ${sill}A${archR} ${archR} 0 0 1 ${cx + archR} ${sill}Z`;
  const intake = `M${shape.nose + 3} ${sill - 21}L${shape.nose + 36} ${sill - 23}L${shape.nose + 36} ${sill - 14}L${shape.nose + 6} ${sill - 12}Z`;

  return (
    <svg viewBox="0 0 480 200" fill="none" aria-hidden {...props}>
      <defs>
        <linearGradient id={ids.shade} x1="0" y1="30" x2="0" y2="155" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity={light ? 0.6 : 0.32} />
          <stop offset=".38" stopColor="#fff" stopOpacity="0" />
          <stop offset=".62" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={light ? 0.16 : 0.34} />
        </linearGradient>
        <linearGradient id={ids.glass} x1="180" y1="30" x2="420" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2b3546" />
          <stop offset=".55" stopColor="#141a24" />
          <stop offset="1" stopColor="#273142" />
        </linearGradient>
        <radialGradient id={ids.rim} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -4) scale(22)">
          <stop stopColor="#eef1f5" />
          <stop offset="1" stopColor="#8d96a3" />
        </radialGradient>
        <radialGradient id={ids.shadow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={`translate(240 ${groundY}) scale(230 14)`}>
          <stop stopColor="#0f172a" stopOpacity=".42" />
          <stop offset=".7" stopColor="#0f172a" stopOpacity=".12" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.clip}>
          <path d={body} />
        </clipPath>
      </defs>

      <ellipse cx="240" cy={groundY} rx="230" ry="14" fill={`url(#${ids.shadow})`} />

      {shape.extra && (
        <path d={shape.extra} stroke={light ? "#9aa1ab" : "#0b0d10"} strokeWidth="4" strokeLinecap="round" />
      )}

      {shape.wheels.map((cx) => (
        <path key={cx} d={well(cx)} fill="#0d0f13" />
      ))}
      <path d={body} fill={paint} />
      <g clipPath={`url(#${ids.clip})`}>
        <rect x="0" y="0" width="480" height="200" fill={`url(#${ids.shade})`} />
        <rect x="0" y={sill - 15} width="480" height="15" fill="#000" opacity={light ? 0.1 : 0.22} />
        {shape.cladding && <rect x="0" y={sill - 10} width="480" height="10" fill="#22262d" />}
        <path d={intake} fill="#0d0f13" opacity=".75" />
        {shape.seams.map((d) => (
          <path key={d} d={d} stroke={line} strokeWidth="1.4" />
        ))}
        <path d={shape.belt} stroke="#fff" strokeOpacity={light ? 0.9 : 0.35} strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d={body} stroke={line} strokeWidth="1.4" />
      {shape.cladding &&
        shape.wheels.map((cx) => (
          <path
            key={cx}
            d={`M${cx - archR - 1} ${sill}A${archR + 1} ${archR + 1} 0 0 1 ${cx + archR + 1} ${sill}`}
            stroke="#22262d"
            strokeWidth="9"
          />
        ))}

      {shape.windows.map((d) => (
        <path key={d} d={d} fill={`url(#${ids.glass})`} />
      ))}
      {shape.windows.length > 0 && (
        <path d={shape.windows[0]} fill="#fff" opacity=".1" transform="translate(6 0) scale(.96 1)" />
      )}

      <path d={shape.mirror} fill={paint} stroke={line} strokeWidth="1.2" />
      {shape.handles.map(([x, y]) => (
        <rect key={x} x={x} y={y} width="18" height="4" rx="2" fill={line} />
      ))}
      <path d={shape.headlight} fill="#f8fbff" stroke="rgba(15,23,42,.35)" strokeWidth="1" />
      <path d={shape.taillight} fill="#c2271c" />

      {shape.wheels.map((cx) => (
        <g key={cx} transform={`translate(${cx} ${shape.wheelY})`}>
          <circle r={shape.wheelR} fill="#14171c" />
          <circle r={shape.wheelR - 3} fill="#1e2228" />
          <circle r={shape.wheelR * 0.64} fill={`url(#${ids.rim})`} />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect
              key={a}
              x="-2.6"
              y={-shape.wheelR * 0.62}
              width="5.2"
              height={shape.wheelR * 0.5}
              rx="2.6"
              fill="#5b6370"
              transform={`rotate(${a})`}
            />
          ))}
          <circle r={shape.wheelR * 0.17} fill="#3a414c" />
          <circle r={shape.wheelR * 0.07} fill="#c9cfd8" />
        </g>
      ))}
    </svg>
  );
}
