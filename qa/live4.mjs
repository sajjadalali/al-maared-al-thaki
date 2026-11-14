// Finds candidate hero photos on Wikimedia Commons (free licences, large, landscape)
// and saves small previews to qa/hero/. This branch is deleted afterwards.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const UA = "al-maared-al-thaki/1.0 (https://maared-al-thaki.duckdns.org; photo search)";
const api = async (params) => (await (await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", ...params })}`, { headers: { "User-Agent": UA } })).json());
const queries = [
  "aerial view car park rows new cars", "new cars port storage aerial", "car lot drone", "Dubai International Motor Show",
  "Qatar Motor Show", "Saudi motor show cars", "Toyota showroom interior", "Lexus showroom", "Nissan showroom interior",
  "car exhibition hall cars", "Kurdistan car dealer", "Iraq cars showroom", "Baghdad cars street new", "Erbil cars",
  "SUV row parked", "Land Cruiser row", "Toyota Land Cruiser 300 showroom", "new car delivery center",
];
mkdirSync("qa/hero", { recursive: true });
const seen = new Map();
const old = new Set(JSON.parse(await (await import("node:fs/promises")).readFile("qa/old.json", "utf8").catch(() => "[]")));
for (const q of queries) {
  const r = await api({ action: "query", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "25", prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "480" });
  for (const p of Object.values(r.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0]; if (!ii) continue;
    const lic = ii.extmetadata?.LicenseShortName?.value ?? "";
    if (!/^(CC0|CC BY(-SA)? \d|Public domain)/i.test(lic)) continue;
    if (ii.width < 2000 || ii.width / ii.height < 1.3) continue;
    if (!seen.has(p.title) && !old.has(p.title)) seen.set(p.title, { q, title: p.title, w: ii.width, h: ii.height, lic, author: (ii.extmetadata?.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 60), date: ii.extmetadata?.DateTimeOriginal?.value?.slice(0, 10) ?? "", thumb: ii.thumburl, page: ii.descriptionurl });
  }
  await new Promise((r) => setTimeout(r, 300));
}
const list = [...seen.values()];
console.log("candidates:", list.length);
let n = 0;
for (const c of list.slice(0, 80)) {
  try {
    const buf = Buffer.from(await (await fetch(c.thumb, { headers: { "User-Agent": UA } })).arrayBuffer());
    c.file = `qa/hero/${String(++n).padStart(2, "0")}.jpg`;
    await sharp(buf).resize(480).jpeg({ quality: 70 }).toFile(c.file);
  } catch (e) { c.error = String(e); }
  await new Promise((r) => setTimeout(r, 150));
}
writeFileSync("qa/hero/list.json", JSON.stringify(list.filter((c) => c.file), null, 1));
console.log("saved:", list.filter((c) => c.file).length);
