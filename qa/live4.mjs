// Live check of PR #70: a test session is logged with is_test. This branch is deleted afterwards.
const SITE = "https://maared-al-thaki.duckdns.org";
const id = `5ade7e57-${crypto.randomUUID().slice(9)}`;
const r = await fetch(`${SITE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "sadeem-check" }, body: JSON.stringify({ message: "شكد سيارة عندكم؟", history: [], sessionId: id }) });
console.log("session", id, "HTTP", r.status, (await r.json()).content?.slice(0, 80));
const html = await (await fetch(SITE + "/")).text();
const js = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
let found = false;
for (const c of js) if ((await (await fetch(SITE + c)).text()).includes("autopro:test")) { found = true; break; }
console.log("test mode in the page's scripts:", found);
