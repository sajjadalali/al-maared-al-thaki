// Previews of Unsplash candidates for the hero photo. This branch is deleted afterwards.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const ids = { "RVEdgp-dkYY": "Kenjiro Yagi", ccgjEBvHTIU: "Dextar Studio", "A-6ymDPGMbU": "Mubashir Shoukat", PmQ6hzofXSc: "Ositadinma Onyeobi", euFJPwObDWI: "Ivan Kazlouskij", LI3tAqwLmdA: "Crosby Hinze", "3WAMh1omVAY": "Erik Mclean", AmFj7Xn9x_k: "Portafolio fotográfico automotriz", PoPsSRju8Y8: "Felix", UlQE9rNwXHQ: "Erik Mclean", "1h491Giz9CU": "Rob Dean", FBXvA9RmjvI: "Alexander Psiuk", lsXEOVFOrhw: "azmar za", bC5NNbwuoB0: "Crosby Hinze" };
mkdirSync("qa/hero", { recursive: true });
const out = [];
let n = 0;
for (const [id, author] of Object.entries(ids)) {
  try {
    const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", Accept: "application/json" };
    const jr = await fetch(`https://unsplash.com/napi/photos/${id}`, { headers: UA });
    const txt = await jr.text();
    let j; try { j = JSON.parse(txt); } catch { throw new Error(`napi ${jr.status}: ${txt.slice(0, 100)}`); }
    if (j.premium || j.plus) throw new Error("Unsplash+ photo");
    const raw = j.urls?.raw; if (!raw) throw new Error("no urls.raw");
    const r = await fetch(`${raw}&w=900&q=75&fm=jpg`);
    const buf = Buffer.from(await r.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const file = `qa/hero/u${String(++n).padStart(2, "0")}.jpg`;
    await sharp(buf).resize(480).jpeg({ quality: 72 }).toFile(file);
    out.push({ id, author: j.user?.name ?? author, file, raw: raw.split("?")[0], fullW: j.width, fullH: j.height, desc: j.alt_description, location: j.location?.title ?? null });
  } catch (e) { out.push({ id, author, error: String(e) }); }
}
writeFileSync("qa/hero/unsplash.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.map((o) => `${o.file ?? "ERR"} ${o.id} ${o.fullW}x${o.fullH} ${o.location ?? ""} ${o.error ?? ""}`)));
