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
