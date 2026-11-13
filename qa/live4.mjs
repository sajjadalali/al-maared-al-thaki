// Live check of PRs #75-#77: the buyer's own 16 messages, 3 rounds (one per rate-limit window). This branch is deleted afterwards.
const SITE = "https://maared-al-thaki.duckdns.org";
const ROUND = Number(process.env.ROUND ?? 1);
const sid = () => `5ade7e57-${crypto.randomUUID().slice(9)}`;
const wa = (d) => { const h = d.actions?.find((a) => a.kind === "whatsapp")?.href; return h ? new URL(h).searchParams.get("text") : null; };
const AR = "\\u0620-\\u065F\\u066E-\\u06D3\\u06FA-\\u06FF";
const BANNED = ["عشان", "أعطيك", "اعطيك", "إياه", "اياه", "شاشتان", "يكدرون", "تكدر", "خذ كلامك", "ما آسف", "معليك", "تبي", "الحين", "وايد", "هل", "تم", "أيضاً", "لماذا", "ماذا", "فقط", "لكن", "معك", "فيه", "فيها", "تحكي", "لقيت", "أقدر", "تقدر", "يقدر", "تقول", "يقول", "عبر", "لدينا", "يوجد", "سوف", "جداً", "الآن", "أوريك", "وياك حق", "هلا وياك", "الرد السابق", "مساعدة المبيعات", "أكول"];
const bannedIn = (t) => BANNED.filter((w) => new RegExp(`(^|[^${AR}])[وفب]?${w}(?![${AR}])`).test(t));
const SELF_FIX = /(?:\.{2,}|…)\s*لا[،,]/;
const WAYA = /ويا(?:هم|ك|نا|كم|ه|ها)\s+[يتن][ء-يچگپ]{2,}|واتساب\s+ويا(?:هم|ك|نا|كم|ه|ها)(?![ء-ي])/;
const DEAREST = "car-003,car-012,car-019";
const NO_CARS = (d) => (d.cars?.length ? `عرض سيارات: ${d.cars.map((c) => c.model)}` : null);
const turns = [
  ["كيف حالك", NO_CARS],
  ["ماريد سيارة اريد نسوان", NO_CARS],
  ["اريد سيارة بمليار", (d) => ((d.cars ?? []).map((c) => c.id).sort().join() === DEAREST ? "أغلى 3 مع ميزانية أكبر من كل السيارات" : null)],
  ["اريد سيارة بمليار دولار", "repeat"],
  ["جوابك غبي", NO_CARS],
  ["ميزانيتي 2 مليار دولار", "repeat"],
  ["ليش ماينصحون بالصني؟", null],
  ["فاشلات الصينيات", null],
  ["معرضكم تافه", NO_CARS],
  ["منو صممك", (d) => NO_CARS(d) ?? (wa(d) || /0783/.test(d.content) ? "طلّع رقم المعرض" : null)],
  ["اريد الي صنعك رقم الموبايل مالته", (d) => NO_CARS(d) ?? (wa(d) || /0783/.test(d.content) ? "طلّع رقم المعرض لسؤال عن اللي صممه" : null)],
  ["ليش من وديتني للواتساب كتبت هاي لرسالة على رغم اني مافضلت او اختاريت رسالة؟؟؟ مرحباً، أستفسر عن سيارة Nissan Patrol 2026", NO_CARS],
  ["القصد اني ماختاريت اي سيارة ليش تفترض من يمك!", NO_CARS],
  ["احجي عراقي لك", NO_CARS],
  ["اريد راحة البال", null],
  ["أريد سيارة زيرو", (d) => {
    const ids = (d.cars ?? []).map((c) => c.id);
    if (ids.sort().join() === DEAREST) return "أغلى 3 بدون ميزانية";
    if (!ids.includes("car-031") || !ids.includes("car-012")) return `مو الأرخص (كولراي) والأغلى (باترول): ${ids}`;
    return /160/.test(d.content) ? null : "مدى الأسعار ما بيه 160";
  }],
];
let fails = 0; const session = sid(); const history = []; let prevIds = "";
console.log(`===== round ${ROUND} =====`);
for (const [say, check] of turns) {
  const r = await fetch(`${SITE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "sadeem-check" }, body: JSON.stringify({ message: say, history, sessionId: session }) });
  const d = await r.json();
  const text = (d.content ?? "").replace(/\[\[car:[^\]]+\]\]/g, "").trim();
  const ids = (d.cars ?? []).map((c) => c.id).sort().join();
  const problems = [];
  if (r.status !== 200) problems.push(`HTTP ${r.status}`);
  const words = bannedIn(text); if (words.length) problems.push(`كلمات: ${words.join("، ")}`);
  const w = text.match(WAYA); if (w) problems.push(`ويا: ${w[0]}`);
  if (SELF_FIX.test(text)) problems.push("يصحح نفسه بنص الجملة");
  const c = check === "repeat" ? (ids && ids === prevIds ? "نفس سيارات الرد اللي قبله" : null) : check ? check(d) : null;
  if (c) problems.push(c);
  if (problems.length) fails++;
  console.log(`${problems.length ? "✗" : "✓"} ${say.slice(0, 60)}\n   cars=${(d.cars ?? []).map((x) => x.model).join(",") || "-"} wa=${JSON.stringify(wa(d))} quick=${JSON.stringify(d.quickReplies ?? [])}${problems.length ? `\n   PROBLEMS: ${problems.join(" | ")}` : ""}\n   > ${text.replace(/\n+/g, " / ").slice(0, 330)}`);
  if (ids) prevIds = ids;
  history.push({ role: "user", content: say }, { role: "assistant", content: d.content ?? "", cars: (d.cars ?? []).map((x) => ({ id: x.id, name: `${x.brand} ${x.model} ${x.year}` })) });
}
console.log(`\nFAILS round ${ROUND}: ${fails}`);
