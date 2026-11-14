// The chosen hero photo: re-run the first search, take No. 36, download it large with its credit. Deleted afterwards.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const UA = "al-maared-al-thaki/1.0 (https://maared-al-thaki.duckdns.org; photo search)";
const api = async (params) => (await (await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", ...params })}`, { headers: { "User-Agent": UA } })).json());
const queries = ["car dealership lot new cars", "car showroom interior cars", "new cars dealership row", "Toyota dealership cars lot", "car dealer lot SUV", "used car lot", "car showroom Dubai", "car market Iraq", "Erbil car showroom", "parking new cars rows", "auto show cars hall", "Land Cruiser dealership"];
const seen = new Map();
for (const q of queries) {
  const r = await api({ action: "query", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "25", prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "480" });
  for (const p of Object.values(r.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0]; if (!ii) continue;
    const lic = ii.extmetadata?.LicenseShortName?.value ?? "";
    if (!/^(CC0|CC BY(-SA)? \d|Public domain)/i.test(lic)) continue;
    if (ii.width < 2400 || ii.width / ii.height < 1.3) continue;
    if (!seen.has(p.title)) seen.set(p.title, { title: p.title, w: ii.width, h: ii.height, lic, licUrl: ii.extmetadata?.LicenseUrl?.value ?? "", author: (ii.extmetadata?.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim(), page: ii.descriptionurl, desc: (ii.extmetadata?.ImageDescription?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 300), date: ii.extmetadata?.DateTimeOriginal?.value ?? "" });
  }
  await new Promise((r) => setTimeout(r, 300));
}
const list = [...seen.values()];
// The 5500-wide CC BY-SA 2.0 photos around No. 36, in case the order moved.
const near = list.map((c, i) => ({ i: i + 1, ...c })).filter((c) => c.w === 5500 || (c.i >= 33 && c.i <= 39));
console.log(near.map((c) => `#${c.i} ${c.w}x${c.h} ${c.lic} | ${c.title} | ${c.author}`).join("\n"));
mkdirSync("qa/hero", { recursive: true });
for (const c of near.filter((c) => c.w === 5500)) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(c.title.replace(/^File:/, "").replace(/ /g, "_"))}?width=3200`;
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  const base = `qa/hero/hall-${c.i}`;
  await sharp(buf).jpeg({ quality: 90 }).toFile(`${base}.jpg`);
  await sharp(buf).resize(900).jpeg({ quality: 75 }).toFile(`${base}-small.jpg`);
  writeFileSync(`${base}.json`, JSON.stringify(c, null, 1));
}
