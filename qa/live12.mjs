import { chromium, webkit, devices } from "playwright";
import fs from "node:fs";
const base = "https://maared-al-thaki.duckdns.org";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const out = {};
for (const [engine, device] of [[chromium, "Pixel 7"], [webkit, "iPhone 14"]]) {
let ev = [];
const b = await engine.launch();
try {
const ctx = await b.newContext({ ...devices[device] });
const p = await ctx.newPage();
const t0 = Date.now(); const log = (m) => ev.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${m}`);
p.on("framenavigated", (f) => f === p.mainFrame() && log("NAV " + f.url()));
p.on("load", () => log("LOAD"));
p.on("pageerror", (e) => log("ERR " + String(e).slice(0, 200)));
p.on("console", (m) => m.type() === "error" && log("CONSOLE " + m.text().slice(0, 200)));
const state = () => p.evaluate(() => ({ open: !!document.querySelector("[data-sadeem-chat]") && getComputedStyle(document.querySelector("[data-sadeem-chat]")).visibility !== "hidden" && !document.querySelector("[data-sadeem-head]"), hist: history.length, st: JSON.stringify(history.state)?.slice(0, 80) })).catch((e) => ({ err: String(e).slice(0, 80) }));
const watch = async (label, ms) => { let last = ""; const end = Date.now() + ms; while (Date.now() < end) { const s = JSON.stringify(await state()); if (s !== last) { log(label + " " + s); last = s; } await p.waitForTimeout(250); } };
await p.goto(base + "/?test", { waitUntil: "load" });
await watch("fresh", 16000);
// scroll like a person
for (let i = 0; i < 6; i++) { await p.evaluate(() => window.scrollBy(0, 700)); await p.waitForTimeout(400); }
await watch("scrolled", 9000);
// open, close with X
await p.evaluate(() => window.scrollTo(0, 0));
await p.locator("[data-sadeem-head] > button").tap(); await watch("opened", 1500);
await p.locator("button[aria-label='إغلاق المحادثة']").tap(); await watch("closed", 12000);
// open and reload while open
await p.locator("[data-sadeem-head] > button").tap(); await p.waitForTimeout(800);
log("RELOAD"); await p.reload({ waitUntil: "load" }); await watch("after-reload", 14000);
await p.locator("[data-sadeem-head] > button").tap(); await watch("opened2", 1500);
await p.locator("button[aria-label='إغلاق المحادثة']").tap(); await watch("closed2", 8000);
} catch (e) { ev.push("FAILED " + String(e).slice(0, 300)); }
out[device] = ev;
await b.close();
}
fs.writeFileSync("qa/out/log.json", JSON.stringify(out, null, 1));
