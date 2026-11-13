// Live check of PR #71, 3 rounds. This branch is deleted afterwards.
const SITE = "https://maared-al-thaki.duckdns.org";
const sid = () => `5ade7e57-${crypto.randomUUID().slice(9)}`;
const wa = (d) => { const h = d.actions?.find((a) => a.kind === "whatsapp")?.href; return h ? new URL(h).searchParams.get("text") : null; };
const CLAIM = /(?:تنكتب|ينكتب)[^\n]{0,30}(?:من|ب)\s*(?:ال)?واتساب|(?:ال)?واتساب\s+(?:هو\s+)?(?:اللي\s+)?(?:يكتب|كتب)/;
let fails = 0;
async function convo(name, turns) {
  const session = sid(); const history = [];
  for (const [say, check] of turns) {
    const r = await fetch(`${SITE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "sadeem-check" }, body: JSON.stringify({ message: say, history, sessionId: session }) });
    const d = await r.json();
    const text = (d.content ?? "").replace(/\[\[car:[^\]]+\]\]/g, "").trim();
    const problem = check ? check(d, text) : null;
    if (problem) fails++;
    console.log(`${problem ? "✗" : "✓"} [${name}] ${say}\n   cars=${(d.cars ?? []).map((c) => c.model).join(",") || "-"} wa=${JSON.stringify(wa(d))}${problem ? `\n   PROBLEM: ${problem}` : ""}\n   > ${text.replace(/\n+/g, " / ").slice(0, 260)}`);
    history.push({ role: "user", content: say }, { role: "assistant", content: d.content ?? "", cars: (d.cars ?? []).map((c) => ({ id: c.id, name: `${c.brand} ${c.model} ${c.year}` })) });
  }
}
const noCarInWa = (d) => { const t = wa(d); return t === null ? null : t === "هلا، عندي سؤال" ? null : `الرسالة: ${t}`; };
for (let round = 1; round <= 3; round++) {
  console.log(`\n===== round ${round} =====`);
  await convo("محادثتك", [
    ["اريد سيارة بمليار", null],
    ["اريد الي صنعك رقم الموبايل مالته", noCarInWa],
    ["ليش من وديتني للواتساب كتبت هاي لرسالة على رغم اني مافضلت او اختاريت رسالة؟؟؟ مرحباً، أستفسر عن سيارة Nissan Patrol 2026", (d, t) => (d.cars?.length ? `عرض سيارة: ${d.cars.map((c) => c.model)}` : CLAIM.test(t) ? `گال الواتساب يكتبها: ${t.match(CLAIM)[0]}` : null)],
    ["القصد اني ماختاريت اي سيارة ليش تفترض من يمك!", (d) => (d.cars?.length ? `عرض سيارة: ${d.cars.map((c) => c.model)}` : null)],
  ]);
  await convo("قائمة ثم تواصل", [
    ["أريد SUV", null],
    ["شلون أتواصل وياكم؟", (d) => (wa(d) === null ? "ما طلع زر واتساب" : noCarInWa(d))],
  ]);
  await convo("سيارة وحدة ثم تواصل", [
    ["تفاصيل الباترول", null],
    ["شلون أتواصل وياكم؟", (d) => (wa(d) === "هلا، أريد أسأل عن نيسان باترول 2026" ? null : `الرسالة: ${wa(d)}`)],
  ]);
}
console.log(`\nFAILS: ${fails}`);
