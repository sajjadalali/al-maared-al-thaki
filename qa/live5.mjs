import { chromium } from "playwright";
import fs from "node:fs";
fs.mkdirSync("qa/out", { recursive: true });
const b = await chromium.launch();
const log = [];
for (const [name, vp, dsf] of [["d", { width: 1440, height: 900 }, 1], ["m", { width: 390, height: 844 }, 2]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: dsf });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const r = await p.goto("https://maared-al-thaki.duckdns.org/", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `qa/out/${name}-top.png` });
  const img = await p.$eval("section picture img", (i) => ({ src: i.currentSrc, ok: i.complete && i.naturalWidth > 0 }));
  const s = p.locator("section", { hasText: "تعرّف على سديم" }).first();
  await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  await s.screenshot({ path: `qa/out/${name}-sadeem.png` });
  const cards = await s.locator("a[href^='/cars/']").count();
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  const credits = await (await b.newPage()).goto("https://maared-al-thaki.duckdns.org/credits");
  log.push({ name, status: r.status(), img, cards, errs, credits: credits.status() });
}
const cp = await b.newPage();
await cp.goto("https://maared-al-thaki.duckdns.org/credits", { waitUntil: "networkidle" });
log.push({ creditsHasBob: (await cp.content()).includes("Bob Harvey") });
fs.writeFileSync("qa/out/log.json", JSON.stringify(log, null, 1));
await b.close();
