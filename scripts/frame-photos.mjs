// Brings every car photo in public/cars to the same 3:2 frame (20 Nov), so the
// cards and the gallery show no grey bands of different sizes around them.
//
// A photo taller than 3:2 (most are 4:3) loses a strip of sky or ground: the
// band kept starts at `y` of the spare height (0 = keep the top, 1 = keep the
// bottom; 0.5 by default). A photo wider than 3:2 keeps all of the car (in
// most of them it reaches both edges): it gets a soft band above and below,
// made from the same photo blurred. A photo taller than 3:2 whose car fills
// its height gets those bands on its sides instead. content/photo-frames.json
// says which photos differ from the default, after looking at each one:
//   { "car-004-1.webp": { "y": 0.36 }, "car-012-1.webp": { "mode": "pad" },
//     "car-003-3.webp": { "mode": "crop" } }   (a wide interior shot: cut its sides)
//
// fetch-photos.mjs frames each photo it downloads. Run this on its own to frame
// the photos already in public/cars: `node scripts/frame-photos.mjs`. A photo
// that is already 3:2 is left as it is, so running it twice changes nothing.

import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES_DIR = join(ROOT, "public", "cars");
const FRAMES_FILE = join(ROOT, "content", "photo-frames.json");

export const RATIO = 3 / 2;
const MAX_WIDTH = 1600;
// Close enough to 3:2 to count as framed (a pixel or two of rounding).
const TOLERANCE = 0.01;

export function frameSettings() {
  return existsSync(FRAMES_FILE) ? JSON.parse(readFileSync(FRAMES_FILE, "utf8")) : {};
}

/** A white mask, transparent for `fade` px at two opposite edges, so the sharp photo melts into the blurred band. */
function fadeMask(width, height, fade, along) {
  const vertical = along === "y";
  const len = vertical ? height : width;
  const f = Math.max(1, Math.min(fade, Math.floor(len / 4)));
  const [x2, y2] = vertical ? ["0", "1"] : ["1", "0"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${f / len}" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${1 - f / len}" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return Buffer.from(svg);
}

/**
 * Returns the photo framed at 3:2 as webp, or null when it already is.
 * `setting`: { mode?: "crop" | "pad", y?: number, x?: number } (see above).
 */
export async function framePhoto(input, setting = {}) {
  const image = sharp(input).rotate();
  const { width: w, height: h } = await image.metadata();
  const ratio = w / h;
  if (Math.abs(ratio - RATIO) <= TOLERANCE) return null;

  const wide = ratio > RATIO;
  const mode = setting.mode ?? (wide ? "pad" : "crop");
  const source = await image.toBuffer();
  let out;

  if (mode === "crop") {
    // Cut the spare width (wide) or height (tall), keeping the band at x / y.
    const cw = wide ? Math.round(h * RATIO) : w;
    const ch = wide ? h : Math.round(w / RATIO);
    const left = Math.round((w - cw) * (setting.x ?? 0.5));
    const top = Math.round((h - ch) * (setting.y ?? 0.5));
    out = sharp(source).extract({ left, top, width: cw, height: ch });
  } else {
    // Keep the whole photo; fill the rest of the 3:2 frame with it, blurred.
    const W = wide ? w : Math.round(h * RATIO);
    const H = wide ? Math.round(w / RATIO) : h;
    const band = sharp(source)
      .resize(W, H, { fit: "cover" })
      .blur(Math.max(W, H) / 45)
      .modulate({ brightness: 0.94, saturation: 0.8 });
    const fade = Math.round(Math.max(W, H) / 60);
    const soft = await sharp(source)
      .ensureAlpha()
      .composite([{ input: fadeMask(w, h, fade, wide ? "y" : "x"), blend: "dest-in" }])
      .png()
      .toBuffer();
    const flat = await band
      .composite([{ input: soft, left: Math.round((W - w) / 2), top: Math.round((H - h) / 2) }])
      .png()
      .toBuffer();
    out = sharp(flat);
  }

  return out.resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}

async function main() {
  const settings = frameSettings();
  const names = readdirSync(IMAGES_DIR).filter((n) => n.endsWith(".webp")).sort();
  let framed = 0;
  for (const name of names) {
    const path = join(IMAGES_DIR, name);
    const result = await framePhoto(readFileSync(path), settings[name]);
    if (!result) continue;
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, result);
    renameSync(tmp, path);
    framed++;
    console.log(`✓ ${name}`);
  }
  console.log(`${framed} صورة تأطرت، ${names.length - framed} جانت أصلاً 3:2.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
