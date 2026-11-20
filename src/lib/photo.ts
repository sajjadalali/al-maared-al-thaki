// Car photos go through the image optimizer, and its copies (and the
// browser's) are kept for hours under the same URL. When the photos in
// public/cars change in place (20 Nov: all framed at 3:2), this version moves
// on, so every visitor gets the new ones at once. next.config.ts allows
// exactly this query on /cars/ photos.
export const PHOTO_VERSION = "2";

export function photoUrl(src: string): string {
  return src.startsWith("/cars/") ? `${src}?v=${PHOTO_VERSION}` : src;
}
