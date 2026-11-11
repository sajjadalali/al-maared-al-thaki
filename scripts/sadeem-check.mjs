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
import { appendFileSync, readFileSync } from "node:fs";

const SITE = (process.env.SITE_URL ?? "https://maared-al-thaki.duckdns.org").replace(/\/$/, "");
const TIMEOUT_MS = 60_000;

// ---------- helpers ----------

const toWestern = (s) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
const stripMarkers = (s) => s.replace(/\n?\[\[car:[\w-]+\]\]/g, "");
const carName = (c) => `${c.brand} ${c.model}`;
const num = (s) => Number(String(s).replace(/,/g, ""));
const near = (a, b, tol) => Math.abs(a - b) <= Math.max(b * tol, 1);

// Cars a buyer can have now, from the catalog the site is built from.
const AVAILABLE = JSON.parse(readFileSync(new URL("../src/data/cars.json", import.meta.url), "utf8")).filter(
  (c) => c.status === "متوفرة"
).length;

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

// Arabic letters and marks, not Arabic punctuation: "فقط،" still ends at the comma.
const AR_LETTER = "\\u0620-\\u065F\\u066E-\\u06D3\\u06FA-\\u06FF";

// Not Iraqi: Gulf, Levantine and Egyptian words, and formal Arabic (فصحى).
const BANNED_WORDS = [
  "تبي", "الحين", "للحين", "وايد", "كويس", "تكدر", "شلونك يا", "إيش", "ايش",
  "أيوه", "ايوه", "حالياً", "حاليا", "الآن", "يوجد", "لا يوجد", "لدينا", "لديك", "سوف", "لماذا", "ماذا",
  "فقط", "لكن", "جداً", "معك", "معهم", "معه", "عبر", "أقدر", "تقدر", "يقدر",
  "أكدر", "لكيت", "تقول", "يقول", "فيه", "فيها",
  "عذراً", "اعتذر", "أعتذر", "عدنا أكو", "أكو عدنا", "أيه", "ايه",
];
// English that belongs in a reply: the body type SUV (as the catalog writes
// it), and the models with no Arabic name in models.name_ar (EV6, GLE 450,
// ES 350, RX 350; 520i has no two-letter word).
const ENGLISH_OK = new Set(["SUV", "EV", "GLE", "ES", "RX"]);
// Sadeem talking about its own steps instead of answering (seen on 3 Nov:
// «سوّيت استدعاء لحفظ الطلب … الحفظ فشل»).
const INTERNAL_TALK = ["استدعاء", "أداة", "الأداة", "قاعدة البيانات", "وصلتني", "الحفظ فشل", "غلط مني"];

function generalChecks(reply, userMessage) {
  const problems = [];
  const text = toWestern(reply.text);

  if (!reply.text.trim()) problems.push("رد فارغ");
  if (reply.ms > 15_000) problems.push(`الرد تأخر ${(reply.ms / 1000).toFixed(1)} ثانية`);
  if (reply.cars.length > 3) problems.push(`عرض ${reply.cars.length} سيارات (الحد 3)`);

  const english = (text.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !ENGLISH_OK.has(w));
  if (english.length) problems.push(`كلمات إنگليزية: ${[...new Set(english)].join("، ")}`);

  const internal = INTERNAL_TALK.filter((word) => text.includes(word));
  if (internal.length) problems.push(`كلام داخلي للزبون: ${internal.map((w) => `«${w}»`).join("، ")}`);

  // "أكو 34 سيارة" when fewer are available.
  for (const m of text.matchAll(/(\d+)\s*(?:سيارة|سيارات)/g)) {
    if (num(m[1]) > AVAILABLE && !toWestern(userMessage).includes(m[1])) problems.push(`عدد «${m[0]}» أكثر من المتوفر (${AVAILABLE})`);
  }

  problems.push(...cardProblems(reply));

  // Bold only for car names (with their year) and comparison labels ("**السعر:**").
  const extraBold = [...toWestern(reply.content ?? "").matchAll(/\*\*([^*\n]+)\*\*(\s*:)?/g)].find(
    (m) => !/(19|20)\d\d/.test(m[1]) && !/[:：]\s*$/.test(m[1]) && !m[2]
  );
  if (extraBold) problems.push(`خط عريض لشي مو اسم سيارة: «${extraBold[1]}»`);

  // The drivetrain alone in a facts line («زيرو · وكالة · رباعي»).
  const bareDrive = text.split("\n").filter((l) => l.includes("·")).flatMap((l) => l.split("·").map((p) => p.trim())).find((p) => /^(رباعي|كلي|أمامي|خلفي)$/.test(p));
  if (bareDrive) problems.push(`«${bareDrive}» لحالها، الصح «دفع ${bareDrive}»`);

  // A count in words, then again as «أكو 2 بهذي المواصفات».
  if (/(?:سيارت|جيب|خيار|كامري)ين(?![\u0621-\u064A])[\s\S]*أكو\s+2\s+بهذي المواصفات/.test(text)) problems.push("كرر العدد: بالكلمات وبعدين «أكو 2»");

  // The same count twice («أكو 14 جيب» at the top and the end).
  const counts = [...text.matchAll(/(?:أكو|عدنا|عندنا)\s+(\d+)\s/g)].map((m) => m[1]);
  const again = counts.find((n, i) => counts.indexOf(n) !== i);
  if (again) problems.push(`كرر العدد ${again} مرتين`);

  // «هذي الكامري 2024 **تويوتا كامري 2024**»: the same car twice in a row.
  const twice = toWestern(reply.content ?? "").match(/(?:ال)?(\S+)\s+(20[12]\d)\s+\*\*[^*]*\1[^*]*\2\*\*/);
  if (twice) problems.push(`اسم السيارة مرتين ورا بعض: «${twice[0]}»`);

  if (text.includes("د.ع")) problems.push("كتب «د.ع» بدل «دينار»");

  if (/ب{3,}/.test(text)) problems.push("حروف مكررة: «ببب»");

  const persian = text.match(/[کیپژ]/g);
  if (persian) problems.push(`حروف فارسية: ${[...new Set(persian)].join("، ")}`);

  for (const word of BANNED_WORDS) {
    if (new RegExp(`(^|[^${AR_LETTER}])[وفب]?${word}(?![${AR_LETTER}])`).test(text)) problems.push(`كلمة مو عراقية: «${word}»`);
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

// A car named in bold twice («**كيا بيكانتو 2024**» in the opening line and
// again as its block), or its card above its own block.
function cardProblems(reply) {
  const problems = [];
  const raw = toWestern(reply.content ?? "");
  const named = [...stripMarkers(raw).matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim()).filter((b) => /\b20[12]\d\b/.test(b));
  named.forEach((a, i) => {
    const again = named.slice(i + 1).find((b) => a.match(/\b20[12]\d\b/)[0] === b.match(/\b20[12]\d\b/)[0] && (a.includes(b) || b.includes(a)));
    if (again) problems.push(`كرر اسم السيارة: «${again}»`);
  });
  const paras = raw.split(/\n\s*\n/);
  paras.forEach((para, i) => {
    for (const m of para.matchAll(/\[\[car:([\w-]+)\]\]/g)) {
      const car = reply.cars.find((c) => c.id === m[1]);
      if (!car) continue;
      const here = stripMarkers(para);
      const block = paras.slice(i + 1).find((later) => {
        const bold = later.trimStart().match(/^\*\*([^*]+)\*\*/);
        // The model's words, without the brand and without numbers ("سنتافي" of
        // "هيونداي سنتافي"; not the "5" of "اكس 5", which "5 مقاعد" also has).
        if (!bold?.[1].includes(String(car.year))) return false;
        const words = bold[1].replace(String(car.year), "").trim().split(/\s+/);
        return (words.length > 1 ? words.slice(1) : words)
          .filter((w) => w.length >= 3 && !/\d/.test(w))
          .some((w) => here.includes(w));
      });
      if (block) problems.push(`كرت ${carName(car)} فوق فقرتها`);
    }
  });
  return [...new Set(problems)];
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
// "ضمن ميزانيتك" next to a price above the budget, in the same phrase
// ("الباقي ضمن الـ 30 مليون: كيا كي 5 بـ 30,500,000 دينار").
const noWithinOver = (budget) => (r) => {
  const bad = toWestern(r.text)
    .split(/[.،\n؟!]/)
    .filter((part) => /ضمن/.test(part) && !/مو ضمن|ما ضمن|خارج/.test(part))
    .filter((part) => [...part.matchAll(/\d{1,3}(?:,\d{3}){2,}/g)].some((m) => num(m[0]) > budget));
  return bad.length ? `گال «ضمن» عن سعر أغلى من الميزانية: «${bad[0].trim()}»` : null;
};

const notInvented = has(/ما عندي|ما أعرف|ما اعرف|معلومة|نتأكد|تتأكد|المعاينة|معاينة|الفحص|فحص|واتساب|تواصل|اتصل/);
// "No paint / no accidents" is fine when a shown car's description says it
// (the used Camry's does); otherwise Sadeem must not claim it and should hedge.
const NO_DAMAGE = /(ما بيها|بدون|خالية من)\s*(أي\s*)?(ضربة|صبغ|حوادث|حادث)/;
const damageAnswer = (r) => {
  const m = r.text.match(NO_DAMAGE);
  if (!m) return notInvented(r);
  return r.cars.some((c) => NO_DAMAGE.test(c.description ?? "")) ? null : `أكّد معلومة ما موجودة بالبيانات: «${m[0]}»`;
};

const CONVERSATIONS = [
  {
    name: "عائلية بحدود 30 مليون",
    turns: [
      {
        say: "أريد سيارة عائلية بحدود 30 مليون",
        expect: [
          cardsSome(() => true, "ما عرض ولا سيارة"),
          // "بحدود 30" searches up to 31.5 million, but a car above 30 must be called over the budget.
          underBudget(30_000_000),
          noWithinOver(30_000_000),
        ],
      },
      { say: "الأولى شكد ماشية؟", expect: [has(/كم|كيلو/), noWithinOver(30_000_000)] },
    ],
  },
  {
    name: "كامري وسؤال عن الحوادث",
    turns: [
      { say: "عندكم كامري؟", expect: [cardsAll((c) => c.model === "Camry", "عرض شي مو كامري"), cardsSome((c) => c.model === "Camry", "ما عرض الكامري")] },
      { say: "المستعملة بيها ضربة لو صبغ؟", expect: [damageAnswer] },
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
    turns: [{ say: "عندكم تسلا؟", expect: [cardsAll((c) => !/tesla/i.test(c.brand), "عرض تسلا مخترعة"), has(/ما عندنا|ما عدنا|ماكو|ما متوفر|ما موجود|حالياً/), cardsSome((c) => c.fuel === "كهربائي", "ما عرض الكهربائية الموجودة"), hasNot(/(كهربائية|كهربائي|كهربا)\s*(ثانية|ثاني|أخرى|غيرها)|خيارات كهربائية/, "عرض خيارات ماكو")] }],
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
    turns: [{ say: "قارنلي بين السبورتاج والتوسان", expect: [hasNot(/هدوء|هادئ|هادية|مريح|راحة|موثوق|اعتمادي|متين|ما تعطل|عطلات/, "رأي مو موجود بالبيانات"), cardsSome((c) => c.model === "Sportage", "ما عرض السبورتاج"), cardsSome((c) => c.model === "Tucson", "ما عرض التوسان")] }],
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
  // Off-topic: never answered, not even in passing ("الأرجنتين فازت… أنا مختص بالسيارات").
  {
    name: "سؤال برا الشغل 2",
    turns: [{ say: "شنو عاصمة فرنسا؟", expect: [hasNot(/باريس/, "جاوب على سؤال برا شغل المعرض"), noCards("عرض سيارات بدون داعي")] }],
  },
  {
    name: "سؤال برا الشغل 3",
    turns: [
      {
        say: "اكتبلي كود بايثون يجمع رقمين",
        expect: [hasNot(/def |print\(|```|return |a \+ b/, "كتب كود"), noCards("عرض سيارات بدون داعي")],
      },
    ],
  },
  // The two cases from 3 Nov. Neither may save a lead: the showroom's own
  // number is refused, and a message without a number has nothing to save.
  {
    name: "طلب بدون رقم",
    turns: [{ say: "أريد SUV عائلية", expect: [cardsSome(() => true, "ما عرض ولا سيارة")] }],
  },
  {
    name: "رقم المعرض كرقم الزبون",
    turns: [
      { say: "أريد أحجز تجربة قيادة للكامري", expect: [hasNot(/سجّلت|سجلت|حفظت|انحفظ|تسجّل|تسجل رقمك/, "گال سجّل رقم والزبون ما كاتب رقم")] },
      {
        say: "هذا رقمي 07838548091",
        expect: [hasNot(/سجّلت|سجلت|حفظت|انحفظ|راح يتصلون بيك/, "قبل رقم المعرض كرقم زبون"), has(/رقم/)],
      },
    ],
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
