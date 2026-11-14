import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const base = "https://maared-al-thaki.duckdns.org";
const b = await chromium.launch(); const log = {};
for (const [name, vp, dsf] of [["d", { width: 1440, height: 1000 }, 1], ["m", { width: 390, height: 844 }, 2]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: dsf });
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(base + "/?test", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(4800);
  const invite = await p.evaluate(() => [...document.querySelectorAll("[data-sadeem-head] > div")].filter((d) => getComputedStyle(d).opacity === "1").map((d) => d.textContent));
  await p.evaluate(() => sessionStorage.setItem("autopro:invites-off", "1")); await p.reload({ waitUntil: "networkidle" });
  await p.screenshot({ path: `qa/out/${name}.png`, fullPage: true, clip: { x: 0, y: 0, width: vp.width, height: name === "m" ? 1700 : 1000 } });
  const text = await p.evaluate(() => document.body.innerText);
  log[name] = { invite, overflow: await p.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth), errs,
    has: Object.fromEntries(["لا تدوخ وتدوّر", "سديم يلگيلك سيارتك", "احچي ويا سديم", "دايخ وتدوّر على سيارة؟", "يجيبلك، يقارن ويحلل", "تاخذ سيارتك المناسبة", "سديم، مساعدك الشخصي لشراء سيارتك", "موظف المبيعات", "تحجز تجربة قيادة"].map((t) => [t, text.includes(t)])) };
  if (name === "m") {
    await p.locator("[data-sadeem-head] > button").click(); await p.waitForTimeout(1500);
    const box = p.locator("[data-sadeem-chat] textarea, [data-sadeem-chat] input[type=text]").first();
    await box.fill("منو انت؟ وشنو شغلك؟"); await box.press("Enter"); await p.waitForTimeout(15000);
    log.chat = await p.evaluate(() => document.querySelector("[data-sadeem-chat]").innerText.slice(0, 900));
    await p.screenshot({ path: "qa/out/m-chat.png" });
  }
}
fs.writeFileSync("qa/out/log.json", JSON.stringify(log, null, 1));
await b.close();
