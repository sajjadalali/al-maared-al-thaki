// Live check of PRs #67, #68, #69. This branch is deleted afterwards.
const SITE = "https://maared-al-thaki.duckdns.org";
const sid = () => `5ade7e57-${crypto.randomUUID().slice(9)}`;
async function ask(message) {
  const r = await fetch(`${SITE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "sadeem-check" }, body: JSON.stringify({ message, history: [], sessionId: sid() }) });
  const d = await r.json();
  console.log(`\n### ${message}\nHTTP ${r.status} cars=${(d.cars ?? []).length}\n${d.content}`);
}
for (const q of ["شكد SUV عندكم؟", "أريد SUV", "عندكم جيب دفع رباعي؟"]) await ask(q);

async function lead(body) {
  const r = await fetch(`${SITE}/api/leads`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 live-check" }, body: JSON.stringify(body) });
  console.log(`\nleads ${JSON.stringify(body)} -> ${r.status} ${await r.text()}`);
}
await lead({ name: "اختبار", phone: "abc" });
await lead({ name: "اختبار", phone: "07838548091" });
await lead({ name: "", phone: "07700000004" });
await lead({ name: "اختبار", phone: "٠٧٧٠٠٠٠٠٠٠٤", message: "طلب تجريبي من الفحص، امسحوه" });
console.log("GET /api/leads ->", (await fetch(`${SITE}/api/leads`)).status);

const html = await (await fetch(`${SITE}/cars/car-001`)).text();
const css = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]);
let found = false;
for (const c of css) { const t = await (await fetch(SITE + c)).text(); if (t.includes("data-contact-bar")) { found = true; console.log("\ncss", c, (t.match(/[^}]{0,80}data-contact-bar[^{]{0,80}\{[^}]{0,60}/) || [])[0]); } }
console.log("docked css live:", found, "| bar padding class:", html.includes("ps-[4.5rem]"), "| sr-only whatsapp:", html.includes("max-[359px]:sr-only"));
