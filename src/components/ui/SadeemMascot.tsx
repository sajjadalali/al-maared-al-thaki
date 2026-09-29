import { useId, type SVGProps } from "react";

/** Sadeem's robot mascot: white head, dark visor with smiling eyes. */
export function SadeemMascot(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  const head = `${id}-head`;
  const visor = `${id}-visor`;

  return (
    <svg viewBox="0 0 120 124" fill="none" aria-hidden {...props}>
      <defs>
        <linearGradient id={head} x1="30" y1="24" x2="96" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfe0f5" />
        </linearGradient>
        <linearGradient id={visor} x1="30" y1="40" x2="90" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1f4c86" />
          <stop offset="1" stopColor="#081627" />
        </linearGradient>
      </defs>

      {/* antenna */}
      <path d="M60 14v12" stroke="#cfe0f5" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="10" r="6" fill="#7cc4ff" />

      {/* body */}
      <rect x="34" y="92" width="52" height="28" rx="14" fill={`url(#${head})`} />
      <circle cx="60" cy="106" r="4" fill="#7cc4ff" />

      {/* ears */}
      <rect x="8" y="50" width="12" height="24" rx="6" fill="#b9cfeb" />
      <rect x="100" y="50" width="12" height="24" rx="6" fill="#b9cfeb" />

      {/* head */}
      <rect x="16" y="24" width="88" height="70" rx="32" fill={`url(#${head})`} />

      {/* visor */}
      <rect x="27" y="38" width="66" height="42" rx="21" fill={`url(#${visor})`} />
      <path d="M41 60q6-8 12 0M67 60q6-8 12 0" stroke="#7cd9ff" strokeWidth="5" strokeLinecap="round" />
      <path d="M53 69q7 6 14 0" stroke="#7cd9ff" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="44" cy="46" rx="7" ry="3" fill="#ffffff" opacity=".18" />
    </svg>
  );
}
