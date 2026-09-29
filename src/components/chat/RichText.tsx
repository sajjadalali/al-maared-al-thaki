import { Fragment, type ReactNode } from "react";

// Minimal, safe formatting for chat replies: **bold** and "- " bullet lines.
// Everything is rendered as React text, so no HTML from a reply is ever injected.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold text-brand-950">
        {/* <bdi> keeps a Latin car name from reordering the Arabic around it */}
        <bdi>{part.slice(2, -2)}</bdi>
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

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
    if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flush();

  return <div className="space-y-1.5">{blocks}</div>;
}
