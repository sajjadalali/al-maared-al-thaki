import { chromium, webkit, devices } from "playwright";
import fs from "node:fs";
fs.rmSync("qa/out", { recursive: true, force: true }); fs.mkdirSync("qa/out", { recursive: true });
const out = [];
const say = (...a) => out.push(a.join(" "));
const base = "https://maared-al-thaki.duckdns.org";
for (const [engine, device] of [[chromium, "Pixel 7"], [webkit, "iPhone 14"]]) { say("== " + device); try {
const b = await engine.launch();
const p = await (await b.newContext({ ...devices[device] })).newPage();
const open = () => p.evaluate(() => !document.querySelector("[data-sadeem-head]"));
await p.goto(base + "/?test", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
await p.locator("[data-sadeem-head] > button").tap(); await p.waitForTimeout(900);
await p.locator("button[aria-label='إغلاق المحادثة']").tap(); await p.waitForTimeout(900);
say("closed with X → open?", await open());
await p.goForward().catch(() => {}); await p.waitForTimeout(1200);
say("FORWARD after closing → open? (must be false)", await open());
await p.locator("[data-sadeem-head] > button").tap(); await p.waitForTimeout(900);
say("tap after that → open? (true)", await open());
await p.goBack().catch(() => {}); await p.waitForTimeout(1200);
say("phone BACK → open? (false)", await open(), "url", p.url());
// from the chat to a car page and back: the chat returns
await p.locator("[data-sadeem-head] > button").tap(); await p.waitForTimeout(900);
await p.evaluate(() => { const a = [...document.querySelectorAll("a[href^='/cars/']")].find((x) => x.getAttribute("href").split("/").length === 3 && !x.getAttribute("href").includes("?")); a.click(); });
await p.waitForURL(/\/cars\/.+/, { timeout: 30000 }); await p.waitForTimeout(2500);
say("on car page → open? (false)", await open(), p.url().slice(21));
await p.goBack(); await p.waitForTimeout(2500);
say("BACK to the chat's page → open? (true)", await open(), p.url().slice(21));
say("title:", await p.evaluate(() => document.querySelector("h1").innerText.replace(/\n/g, " / ")));
await p.evaluate(() => sessionStorage.setItem("autopro:invites-off", "1")); await p.reload({ waitUntil: "networkidle" }); await p.screenshot({ path: `qa/out/${device.replace(" ", "")}.png`, fullPage: true, clip: { x: 0, y: 1150, width: 390, height: 700 } });
await b.close(); } catch (e) { say("FAILED", String(e).slice(0, 200)); } }
fs.writeFileSync("qa/out/log.json", JSON.stringify(out, null, 1));
