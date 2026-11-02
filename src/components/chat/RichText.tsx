import { Fragment, type ReactNode } from "react";

// An Iraqi mobile number as replies write it: "0783 854 8091", "07838548091",
// "+964 783 854 8091".
const PHONE = /((?:\+964|0)\s?7\d{2}[\s-]?\d{3}[\s-]?\d{4})/g;

// Phone numbers read left to right (in Arabic text the browser would show
// "8091 854 0783") and can be tapped to call.
function withPhones(text: string, key: number): ReactNode[] {
  return text.split(PHONE).map((part, i) =>
    i % 2 ? (
      <a
        key={`${key}-${i}`}
        href={`tel:${part.replace(/[\s-]/g, "").replace(/^0/, "+964")}`}
        dir="ltr"
        className="inline-block font-bold text-brand-800 underline decoration-brand-200 underline-offset-4"
      >
        {part}
      </a>
    ) : (
      <Fragment key={`${key}-${i}`}>{part}</Fragment>
    )
  );
}

// Minimal, safe formatting for chat replies: **bold**, "- " bullet lines and
// phone numbers. Everything is rendered as React text, so no HTML from a
// reply is ever injected.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).flatMap((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold text-brand-950">
        {/* <bdi> keeps a Latin car name from reordering the Arabic around it */}
        <bdi>{part.slice(2, -2)}</bdi>
      </strong>
    ) : (
      withPhones(part, i)
    )
  );
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  // An empty line separates blocks (one car from the next): a visible gap.
  let gap = false;

  const flush = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <span>{inline(b)}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim()) {
      gap = blocks.length > 0;
      continue;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className={gap ? "pt-2.5" : undefined}>
        {inline(line)}
      </p>
    );
    gap = false;
  }
  flush();

  return <div className="space-y-1.5">{blocks}</div>;
}
