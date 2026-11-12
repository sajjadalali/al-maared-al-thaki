// The picture a shared car link shows (WhatsApp, Telegram, Facebook): the car's
// first photo, cropped to the 1200×630 link-preview shape, as a JPEG. The site's
// photos are WebP, and not every app that builds link previews reads WebP.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getCatalog } from "@/server/catalog";

export const alt = "صورة السيارة";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = (await getCatalog()).getCarById(id)?.images[0];
  // Only the car photos under public/cars.
  if (!photo || !/^\/cars\/[\w.-]+$/.test(photo)) return new Response("Not found", { status: 404 });
  const file = await readFile(join(process.cwd(), "public", photo));
  const jpeg = await sharp(file)
    .resize(size.width, size.height, { fit: "cover" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  // Built on request; apps that fetch it again within the hour get the same picture.
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" } });
}
