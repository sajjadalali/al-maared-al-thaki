// Tests Sadeem on the live site with fixed buyer conversations, then checks
// every reply against the cars it showed.
//
// Usage:
//   npm run sadeem-check                       against the live site
//   SITE_URL=http://localhost:3000 npm run sadeem-check
//
// Every test conversation is logged on the site like a real one, with a
// session id starting "5ade7e57-", so a reviewer can read the whole run in
// Supabase: select … from chat_messages where session_id::text like '5ade7e57-%'.
// About 14 replies a run (the site allows 30 per 10 minutes per visitor).
// Exit code 1 when a check fails, so the GitHub workflow shows red.

import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";

const SITE = (process.env.SITE_URL ?? "https://maared-al-thaki.duckdns.org").replace(/\/$/, "");
const TIMEOUT_MS = 60_000;

// ---------- helpers ----------

const toWestern = (s) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
const stripMarkers = (s) => s.replace(/\n?\[\[car:[\w-]+\]\]/g, "");
const carName = (c) => `${c.brand} ${c.model}`;
const num = (s) => Number(String(s).replace(/,/g, ""));
const near = (a, b, tol) => Math.abs(a - b) <= Math.max(b * tol, 1);

const sessionId = () => `5ade7e57-${randomUUID().slice(9)}`;

async function ask(message, history, session) {
  const started = Date.now();
  const res = await fetch(`${SITE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "sadeem-check" },
    body: JSON.stringify({ message, history, sessionId: session }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const ms = Date.now() - started;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { ...data, cars: data.cars ?? [], ms, text: stripMarkers(data.content ?? "") };
}

// ---------- checks every reply gets ----------

const BANNED_WORDS = ["تبي", "الحين", "وايد", "كويس", "تكدر", "شلونك يا", "إيش", "ايش"];

function generalChecks(reply, userMessage) {
  const problems = [];
  const text = toWestern(reply.text);

  if (!reply.text.trim()) problems.push("رد فارغ");
  if (reply.ms > 15_000) problems.push(`الرد تأخر ${(reply.ms / 1000).toFixed(1)} ثانية`);
  if (reply.cars.length > 3) problems.push(`عرض ${reply.cars.length} سيارات (الحد 3)`);

  const english = text.match(/[A-Za-z]{2,}/g);
  if (english) problems.push(`كلمات إنگليزية: ${[...new Set(english)].join("، ")}`);

  for (const word of BANNED_WORDS) {
    if (new RegExp(`(^|[^\\u0600-\\u06FF])[وفب]?${word}(?![\\u0600-\\u06FF])`).test(text)) problems.push(`كلمة مو عراقية: «${word}»`);
  }

  // Mileage, horsepower and model years in the text must belong to a shown car
  // (or to the buyer's own words).
  const asked = toWestern(userMessage);
  for (const m of text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(ألف|الف)?\s*(?:كم|كيلو)/g)) {
    const v = num(m[1]) * (m[2] ? 1000 : 1);
    if (!reply.cars.some((c) => near(v, c.mileage, 0.02)) && !asked.includes(m[1])) problems.push(`ممشى «${m[0]}» ما يطابق أي كرت`);
  }
  for (const m of text.matchAll(/(\d{2,4})\s*حصان/g)) {
    const v = num(m[1]);
    if (!reply.cars.some((c) => c.horsepower === v) && !asked.includes(m[1])) problems.push(`قوة «${m[0]}» ما تطابق أي كرت`);
  }
  for (const m of text.matchAll(/\b(20[12]\d)\b/g)) {
    const v = num(m[1]);
    if (reply.cars.length && !reply.cars.some((c) => c.year === v) && !asked.includes(m[1])) problems.push(`سنة «${m[1]}» ما تطابق أي كرت`);
  }
  return problems;
}

// ---------- the conversations ----------
// Each turn: what the buyer writes, and what this reply must (not) do.

const has = (re) => (r) => (re.test(r.text) ? null : `لازم يذكر شي مثل ${re}`);
const hasNot = (re, why) => (r) => {
  const m = r.text.match(re);
  return m ? `${why}: «${m[0]}»` : null;
};
const cardsAll = (pred, why) => (r) => {
  const bad = r.cars.filter((c) => !pred(c));
  return bad.length ? `${why}: ${bad.map(carName).join("، ")}` : null;
};
const cardsSome = (pred, why) => (r) => (r.cars.some(pred) ? null : why);
const noCards = (why) => (r) => (r.cars.length ? `${why}: ${r.cars.map(carName).join("، ")}` : null);
const underBudget = (budget) => (r) => {
  const over = r.cars.filter((c) => c.price > budget);
  if (!over.length) return null;
  return /أغلى|اغلى|فوق ميزانيت|أكثر من ميزانيت|زيادة|يزيد|تزيد|يتجاوز/.test(r.text)
    ? null
    : `سيارات أغلى من الميزانية بدون ما يگول: ${over.map(carName).join("، ")}`;
};
const notInvented = has(/ما عندي|ما أعرف|ما اعرف|معلومة|نتأكد|تتأكد|المعاينة|معاينة|الفحص|فحص|واتساب|تواصل|اتصل/);

const CONVERSATIONS = [
  {
    name: "عائلية بحدود 30 مليون",
    turns: [
      { say: "أريد سيارة عائلية بحدود 30 مليون", expect: [cardsSome(() => true, "ما عرض ولا سيارة"), underBudget(30_000_000)] },
      { say: "الأولى شكد ماشية؟", expect: [has(/كم|كيلو/)] },
    ],
  },
  {
    name: "كامري وسؤال عن الحوادث",
    turns: [
      { say: "عندكم كامري؟", expect: [cardsAll((c) => c.model === "Camry", "عرض شي مو كامري"), cardsSome((c) => c.model === "Camry", "ما عرض الكامري")] },
      { say: "المستعملة بيها ضربة لو صبغ؟", expect: [hasNot(/(ما بيها|بدون|خالية من)\s*(أي\s*)?(ضربة|صبغ|حوادث|حادث)/, "أكّد معلومة ما موجودة بالبيانات"), notInvented] },
    ],
  },
  {
    name: "التقسيط",
    turns: [
      { say: "أكو تقسيط؟ شكد الدفعة الأولى؟", expect: [hasNot(/\d+\s*%|دفعة أولى\s*\d|قسط\s*(شهري\s*)?\d/, "ألّف شروط تقسيط"), notInvented] },
    ],
  },
  {
    name: "ميزانية أقل من أرخص سيارة",
    turns: [{ say: "ميزانيتي 10 مليون بس", expect: [cardsSome((c) => c.model === "Picanto", "ما عرض أرخص سيارة (بيكانتو)"), underBudget(10_000_000)] }],
  },
  {
    name: "7 ركاب",
    turns: [{ say: "أريد جيب 7 ركاب", expect: [cardsSome(() => true, "ما عرض ولا سيارة"), cardsAll((c) => c.seats >= 7, "عرض سيارة أقل من 7 مقاعد")] }],
  },
  {
    name: "سيارة ما موجودة",
    turns: [{ say: "عندكم تسلا؟", expect: [cardsAll((c) => !/tesla/i.test(c.brand), "عرض تسلا مخترعة"), has(/ما عندنا|ماكو|ما متوفر|ما موجود|حالياً/)] }],
  },
  {
    name: "كورية جديدة تحت 40",
    turns: [
      {
        say: "أريد سيارة كورية جديدة تحت 40 مليون",
        // There is none in the catalog: Sadeem must say so before offering anything else.
        expect: [has(/ماكو|ما عندنا|ما لگيت|ما لقيت|ما متوفر|ما موجود|ما عدنا/), underBudget(40_000_000)],
      },
    ],
  },
  {
    name: "مقارنة",
    turns: [{ say: "قارنلي بين السبورتاج والتوسان", expect: [cardsSome((c) => c.model === "Sportage", "ما عرض السبورتاج"), cardsSome((c) => c.model === "Tucson", "ما عرض التوسان")] }],
  },
  {
    name: "المكان",
    turns: [{ say: "وين مكانكم بالضبط؟", expect: [hasNot(/شارع|حي\s|منطقة|قرب|مقابل|مجاور/, "ذكر عنوان مو موجود"), has(/واتساب|تواصل|بغداد/)] }],
  },
  {
    name: "سؤال برا الشغل",
    turns: [{ say: "منو فاز بكأس العالم 2022؟", expect: [hasNot(/الأرجنتين|ارجنتين|ميسي|فرنسا/, "جاوب على سؤال برا شغل المعرض"), noCards("عرض سيارات بدون داعي")] }],
  },
  {
    name: "أرخص سيارة",
    turns: [{ say: "شنو أرخص سيارة عندكم؟", expect: [cardsSome((c) => c.model === "Picanto", "ما عرض البيكانتو (أرخص سيارة)")] }],
  },
  {
    name: "قوة المحرك",
    turns: [{ say: "شكد قوة محرك الهافال؟", expect: [cardsSome((c) => c.brand === "Haval", "ما عرض الهافال"), has(/حصان/)] }],
  },
];

// ---------- run ----------

const results = [];
let failed = 0;

for (const convo of CONVERSATIONS) {
  const session = sessionId();
  const history = [];
  for (const turn of convo.turns) {
    let reply;
    let problems;
    try {
      reply = await ask(turn.say, history, session);
      problems = [...generalChecks(reply, turn.say), ...turn.expect.map((check) => check(reply)).filter(Boolean)];
    } catch (err) {
      reply = { text: "", cars: [], ms: 0 };
      problems = [`ما وصل رد: ${err.message}`];
    }
    if (problems.length) failed++;
    results.push({ convo: convo.name, say: turn.say, reply: reply.text, cars: reply.cars.map(carName), ms: reply.ms, problems, session });
    console.log(`${problems.length ? "✗" : "✓"} [${convo.name}] ${turn.say} (${(reply.ms / 1000).toFixed(1)}s)`);
    for (const p of problems) console.log(`    - ${p}`);
    history.push({ role: "user", content: turn.say });
    history.push({
      role: "assistant",
      content: reply.text,
      cars: reply.cars.map((c) => ({ id: c.id, name: `${c.brand} ${c.model} ${c.year}` })),
      matchCount: reply.matchCount,
    });
  }
}

const total = results.length;
const avg = results.reduce((s, r) => s + r.ms, 0) / Math.max(total, 1) / 1000;
const summary = [
  `## اختبار سديم: ${total - failed} من ${total} نجحت`,
  "",
  `الموقع: ${SITE} · معدل وقت الرد: ${avg.toFixed(1)} ثانية`,
  "",
  "| | المحادثة | الزبون | المشاكل |",
  "|---|---|---|---|",
  ...results.map((r) => `| ${r.problems.length ? "✗" : "✓"} | ${r.convo} | ${r.say} | ${r.problems.join("<br>") || "—"} |`),
  "",
  "<details><summary>الردود كاملة</summary>",
  "",
  ...results.flatMap((r) => [`**${r.say}**`, "", "> " + (r.reply || "(ماكو رد)").replace(/\n+/g, "\n> "), "", `الكروت: ${r.cars.join("، ") || "ماكو"}`, ""]),
  "</details>",
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
