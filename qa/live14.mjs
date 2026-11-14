import { chromium, webkit, devices } from "playwright";
import fs from "node:fs";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const out = {};
for (const [name, engine, opts] of [["laptop", chromium, { viewport: { width: 1366, height: 768 } }], ["android", chromium, devices["Pixel 7"]], ["iphone", webkit, devices["iPhone 14"]]]) {
  const b = await engine.launch(); const rows = [];
  try {
    const p = await (await b.newContext(opts)).newPage();
    for (const round of ["first load", "refresh"]) {
      if (round === "first load") await p.goto("https://maared-al-thaki.duckdns.org/", { waitUntil: "commit" }); else await p.reload({ waitUntil: "commit" });
      const t0 = Date.now(); let last = ""; let everVisible = false;
      while (Date.now() - t0 < 9000) {
        const s = await p.evaluate(() => { const f = document.querySelector("[data-sadeem-chat]"); if (!f) return "no frame"; const cs = getComputedStyle(f); return `${f.getAttribute("aria-busy") ? "placeholder" : "panel"} ${cs.visibility}`; }).catch(() => "loading");
        if (s.endsWith("visible")) everVisible = true;
        if (s !== last) { rows.push(`${round} ${Date.now() - t0}ms ${s}`); last = s; }
        await p.waitForTimeout(40);
      }
      rows.push(`${round}: chat frame ever visible = ${everVisible}`);
    }
    await p.locator("[data-sadeem-head] > button").click(); await p.waitForTimeout(700);
    rows.push("tap opens the chat = " + (await p.evaluate(() => getComputedStyle(document.querySelector("[data-sadeem-chat]")).visibility === "visible")));
  } catch (e) { rows.push("FAILED " + String(e).slice(0, 200)); }
  out[name] = rows; await b.close();
}
fs.writeFileSync("qa/out/log.json", JSON.stringify(out, null, 1));
