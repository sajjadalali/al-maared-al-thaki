// Hero photo: the two best Commons candidates at full preview size, with their credits. Deleted afterwards.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const UA = "al-maared-al-thaki/1.0 (https://maared-al-thaki.duckdns.org; photo search)";
const api = async (params) => (await (await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", ...params })}`, { headers: { "User-Agent": UA } })).json());
mkdirSync("qa/hero", { recursive: true });
const found = [];
for (const [q, pick] of [["used car lot", (ii) => ii.width >= 5000 && ii.height >= 2500], ["car showroom interior cars", (ii) => ii.width >= 5000], ["Qatar Motor Show", (ii) => ii.width >= 2300 && ii.width <= 2500], ["Dubai International Motor Show", (ii) => ii.width >= 2300 && ii.width <= 2500], ["car exhibition hall cars", (ii) => true]]) {
  const r = await api({ action: "query", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "40", prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "1400" });
  for (const p of Object.values(r.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0]; if (!ii) continue;
    const lic = ii.extmetadata?.LicenseShortName?.value ?? "";
    if (!/^(CC0|CC BY(-SA)? \d|Public domain)/i.test(lic) || ii.width / ii.height < 1.3 || !pick(ii)) continue;
    if (found.some((f) => f.title === p.title)) continue;
    found.push({ q, title: p.title, w: ii.width, h: ii.height, lic, author: (ii.extmetadata?.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 80), thumb: ii.thumburl, page: ii.descriptionurl, desc: (ii.extmetadata?.ImageDescription?.value ?? "").replace(/<[^>]+>/g, "").slice(0, 140) });
  }
}
let n = 0;
for (const c of found.slice(0, 24)) {
  try { const buf = Buffer.from(await (await fetch(c.thumb, { headers: { "User-Agent": UA } })).arrayBuffer()); c.file = `qa/hero/c${String(++n).padStart(2, "0")}.jpg`; await sharp(buf).resize(1000).jpeg({ quality: 78 }).toFile(c.file); } catch (e) { c.error = String(e); }
  await new Promise((r) => setTimeout(r, 200));
}
writeFileSync("qa/hero/c.json", JSON.stringify(found.filter((c) => c.file), null, 1));
console.log(found.filter((c) => c.file).map((c) => `${c.file} ${c.w}x${c.h} ${c.lic} | ${c.title}`).join("\n"));
