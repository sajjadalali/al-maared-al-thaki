import { useId, type SVGProps } from "react";

/** A stylised sedan side view, used where no real photo is available. */
export function CarIllustration(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  const body = `${id}-body`;
  const glass = `${id}-glass`;

  return (
    <svg viewBox="0 0 212 92" fill="none" aria-hidden {...props}>
      <defs>
        <linearGradient id={body} x1="20" y1="18" x2="20" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#c7d9f0" />
        </linearGradient>
        <linearGradient id={glass} x1="70" y1="22" x2="160" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4d84c2" />
          <stop offset="1" stopColor="#132f54" />
        </linearGradient>
      </defs>

      <ellipse cx="106" cy="84" rx="92" ry="5" fill="#000" opacity=".28" />

      <path
        d="M16 64c0-9 5-14 16-16l30-5 22-17c6-5 12-7 20-7h32c8 0 14 3 19 8l18 16 13 3c9 2 14 7 14 14v6c0 3-2 5-5 5H21c-3 0-5-2-5-5z"
        fill={`url(#${body})`}
      />
      <path d="M69 44l19-15c4-3 8-4 13-4h11v19z" fill={`url(#${glass})`} />
      <path d="M118 25h14c6 0 10 2 14 6l13 13h-41z" fill={`url(#${glass})`} />
      <path d="M115 46v24M16 60h180" stroke="#9fb6d3" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
      <rect x="190" y="52" width="9" height="5" rx="2.5" fill="#ffd166" />
      <rect x="15" y="54" width="7" height="5" rx="2.5" fill="#ff7a7a" />

      {[54, 162].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="72" r="14" fill="#081627" />
          <circle cx={cx} cy="72" r="7" fill="#c7d9f0" />
          <circle cx={cx} cy="72" r="2.5" fill="#081627" />
        </g>
      ))}
    </svg>
  );
}
