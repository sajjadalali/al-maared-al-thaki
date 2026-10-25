import rawCredits from "./image-credits.json";

/** Attribution for a licensed photo (written by `npm run fetch-photos`). */
export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl?: string;
  /** The photo's page on Wikimedia Commons. */
  source: string;
}

const credits = rawCredits as Record<string, ImageCredit>;

/** Returns the attribution for an image path such as "/cars/car-001-1.webp". */
export function getImageCredit(src: string): ImageCredit | undefined {
  return credits[src];
}

export function hasImageCredits(): boolean {
  return Object.keys(credits).length > 0;
}
