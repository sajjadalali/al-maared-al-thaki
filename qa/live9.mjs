import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const b = await chromium.launch(); const log = {};
for (const [name, vp, dsf] of [["d", { width: 1440, height: 900 }, 1], ["m", { width: 390, height: 844 }, 2]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: dsf });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto("https://maared-al-thaki.duckdns.org/", { waitUntil: "networkidle", timeout: 90000 });
  await p.evaluate(() => sessionStorage.setItem("autopro:invites-off", "1")); await p.reload({ waitUntil: "networkidle" });
  await p.screenshot({ path: `qa/out/${name}.png`, fullPage: true, clip: { x: 0, y: 0, width: vp.width, height: name === "m" ? 1500 : 900 } });
  log[name] = { hasRoad: await p.evaluate(() => document.body.innerText.includes("سديم يرشّح لك")), overflow: await p.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth), errs };
}
const c = await b.newPage(); const r = await c.goto("https://maared-al-thaki.duckdns.org/credits"); log.credits = [r.status(), (await c.content()).includes("Bob Harvey")];
fs.writeFileSync("qa/out/log.json", JSON.stringify(log));
await b.close();
