import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const b = await chromium.launch(); const log = {};
for (const [name, vp, dsf] of [["d", { width: 1440, height: 1000 }, 1], ["m", { width: 390, height: 844 }, 2]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: dsf });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("https://maared-al-thaki.duckdns.org/", { waitUntil: "networkidle", timeout: 90000 });
  await p.evaluate(() => sessionStorage.setItem("autopro:invites-off", "1")); await p.reload({ waitUntil: "networkidle" });
  await p.screenshot({ path: `qa/out/${name}-hero.png`, fullPage: true, clip: { x: 0, y: 0, width: vp.width, height: name === "m" ? 1560 : 1000 } });
  const s = p.locator("section", { has: p.locator("h2", { hasText: "اختر حسب نوع السيارة" }) }).first();
  await s.scrollIntoViewIfNeeded(); await s.screenshot({ path: `qa/out/${name}-types.png` });
  const text = await p.evaluate(() => document.body.innerText);
  log[name] = { title: text.includes("سيارتك المناسبة،") && text.includes("بأقصر طريق"), old: text.includes("لا تدوخ وتدوّر"), overflow: await p.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth), errs };
}
fs.writeFileSync("qa/out/log.json", JSON.stringify(log));
await b.close();
