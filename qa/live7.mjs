import { chromium } from "playwright";
import fs from "node:fs";
fs.mkdirSync("qa/out", { recursive: true });
const base = "https://maared-al-thaki.duckdns.org";
const b = await chromium.launch();
const log = {};
const bubble = (p) => p.evaluate(() => [...document.querySelectorAll("[data-sadeem-head] > div")].filter((d) => getComputedStyle(d).opacity === "1").map((d) => d.textContent));
for (const [name, vp, dsf] of [["d", { width: 1440, height: 900 }, 1], ["m", { width: 390, height: 844 }, 2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  await p.goto(base + "/?test", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(4800);
  const first = await bubble(p);
  await p.screenshot({ path: `qa/out/${name}-head.png` });
  const s = p.locator("section", { hasText: "موظف المبيعات أونلاين" }).first();
  await s.scrollIntoViewIfNeeded();
  const t0 = Date.now();
  for (const [label, at] of [["s0", 5200], ["s1", 7200 + 5200], ["s2", 14400 + 5600], ["s3", 21600 + 5200]]) { await p.waitForTimeout(Math.max(0, at - (Date.now() - t0))); await s.screenshot({ path: `qa/out/${name}-${label}.png` }); }
  const overflow = await p.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth);
  // open: mid-flight frame, then landed
  await p.locator("[data-sadeem-head] > button").click();
  await p.waitForTimeout(120); await p.screenshot({ path: `qa/out/${name}-opening.png` });
  await p.waitForTimeout(900); await p.screenshot({ path: `qa/out/${name}-open.png` });
  await p.locator("button[aria-label='إغلاق المحادثة']").click();
  await p.waitForTimeout(140); await p.screenshot({ path: `qa/out/${name}-closing.png` });
  await p.waitForTimeout(900);
  // a question button asks the real Sadeem (test session)
  await p.locator("button[aria-label^='اسأل سديم:']").nth(3).click({ force: true });
  await p.waitForTimeout(16000);
  const reply = await p.evaluate(() => document.querySelector("[data-sadeem-chat]").innerText.slice(0, 700));
  await p.screenshot({ path: `qa/out/${name}-asked.png` });
  await p.locator("button[aria-label='إغلاق المحادثة']").click();
  await p.waitForTimeout(5200);
  const afterChat = await bubble(p);
  await p.waitForTimeout(10000);
  const afterChat2 = await bubble(p);
  log[name] = { first, overflow, reply, afterChat, afterChat2, errs };
  await ctx.close();
}
fs.writeFileSync("qa/out/log.json", JSON.stringify(log, null, 1));
await b.close();
