import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const b = await chromium.launch();
for (const [name, vp, dsf] of [["d", { width: 1440, height: 900 }, 1], ["m", { width: 390, height: 844 }, 2]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: dsf });
  await p.goto("https://maared-al-thaki.duckdns.org/", { waitUntil: "networkidle", timeout: 90000 });
  await p.evaluate(() => sessionStorage.setItem("autopro:invites-off", "1"));
  await p.reload({ waitUntil: "networkidle" });
  const s = p.locator("section", { has: p.locator("h2", { hasText: "سديم، موظف المبيعات أونلاين" }) }).first();
  await s.scrollIntoViewIfNeeded();
  const t0 = Date.now();
  for (const [label, at] of [["s0", 5200], ["s1", 7200 + 5200], ["s2", 14400 + 5600], ["s3", 21600 + 5200]]) { await p.waitForTimeout(Math.max(0, at - (Date.now() - t0))); await s.screenshot({ path: `qa/out/${name}-${label}.png` }); }
}
await b.close();
