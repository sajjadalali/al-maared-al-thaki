// Where a car's card goes inside a reply: the server puts a marker line right
// after the paragraph about that car, and the chat draws the card there, so
// each car's few lines of text are followed by its card.

const MARKER = /\n?\[\[car:([\w-]+)\]\]/g;

export const carMarker = (id: string) => `[[car:${id}]]`;

/** The reply as the buyer reads it (and as the model sees it in the history). */
export const stripCarMarkers = (text: string) => text.replace(MARKER, "");

/** The reply cut at its markers: text, then a car id, then text… */
export function splitAtCars(text: string): ({ text: string } | { carId: string })[] {
  const parts: ({ text: string } | { carId: string })[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    parts.push({ text: text.slice(last, match.index) });
    parts.push({ carId: match[1] });
    last = match.index + match[0].length;
  }
  parts.push({ text: text.slice(last) });
  return parts.filter((part) => !("text" in part) || part.text.trim());
}

/**
 * A car's own lines and its card, as one: when a paragraph that opens with the
 * car's name in bold («**كيا بيكانتو 2024**») sits right above that car's card,
 * the name leaves the text (the card shows it) and the lines under it become
 * the card's note. Without this every car was named twice, in a bubble and on
 * its card, and three cars filled the screen.
 */
export function joinCarBlocks(parts: ({ text: string } | { carId: string })[]) {
  const notes = new Map<string, string>();
  const out: ({ text: string } | { carId: string })[] = [];
  parts.forEach((part, i) => {
    const next = parts[i + 1];
    if (!("text" in part) || !next || !("carId" in next)) {
      out.push(part);
      return;
    }
    const paragraphs = part.text.trim().split(/\n\s*\n/);
    const [first, ...lines] = paragraphs[paragraphs.length - 1].split("\n");
    if (!/^\*\*[^*]+\b(19|20)\d\d\*\*\s*$/.test(first.trim())) {
      out.push(part);
      return;
    }
    const note = lines.map((line) => line.trim()).filter(Boolean).join("\n");
    if (note) notes.set(next.carId, note);
    const before = paragraphs.slice(0, -1).join("\n\n").trim();
    if (before) out.push({ text: before });
  });
  return { parts: out, notes };
}
