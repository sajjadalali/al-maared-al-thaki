// Converts content/cars.xlsx into src/data/cars.json.
// Usage: npm run import-cars [-- path/to/file.xlsx]
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = resolve(process.argv[2] ?? join(ROOT, "content", "cars.xlsx"));
const OUTPUT = join(ROOT, "src", "data", "cars.json");
const IMAGES_DIR = join(ROOT, "public", "cars");
const SHEET_NAME = "السيارات";

const HEADERS = {
  "المعرف": "id",
  "الماركة": "brand",
  "الموديل": "model",
  "سنة الصنع": "year",
  "السعر (دينار)": "price",
  "الحالة": "condition",
  "نوع الهيكل": "bodyType",
  "الكيلومترات": "mileage",
  "ناقل الحركة": "transmission",
  "الوقود": "fuel",
  "المحرك": "engine",
  "المقاعد": "seats",
  "اللون": "color",
  "المدينة": "city",
  "التوفر": "status",
  "مميزة": "featured",
  "وسوم": "tags",
  "الوصف": "description",
  "المواصفات الإضافية": "features",
  "الصور": "images",
};
const LABELS = Object.fromEntries(Object.entries(HEADERS).map(([ar, key]) => [key, ar]));

const REQUIRED = ["brand", "model", "year", "price", "condition", "bodyType", "transmission", "fuel", "city"];
const ENUMS = {
  condition: ["جديدة", "مستعملة"],
  bodyType: ["سيدان", "SUV", "هاتشباك", "دفع رباعي", "شاحنة", "كوبيه"],
  transmission: ["أوتوماتيك", "يدوي"],
  fuel: ["بنزين", "ديزل", "هايبرد", "كهربائي"],
  status: ["متوفرة", "محجوزة", "مباعة"],
};
const YES = ["نعم", "yes", "true", "1", "✓"];
const NO = ["لا", "no", "false", "0", ""];

const errors = [];
const warnings = [];

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return cellText(value.result);
    if ("error" in value) return "";
  }
  return String(value).trim();
}

function toNumber(text) {
  const western = text
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[,،\s]|د\.ع|كم/g, "");
  if (!/^\d+(\.\d+)?$/.test(western)) return NaN;
  return Number(western);
}

function toList(text) {
  return text
    .split(/[،,|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  if (!existsSync(INPUT)) {
    console.error(`✗ لم يتم العثور على الملف: ${INPUT}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    console.error(`✗ لا توجد ورقة باسم «${SHEET_NAME}» داخل الملف.`);
    process.exit(1);
  }

  const columns = {};
  sheet.getRow(1).eachCell((cell, col) => {
    const header = cellText(cell.value).replace(/\*/g, "").trim();
    const key = HEADERS[header] ?? (Object.values(HEADERS).includes(header) ? header : null);
    if (key) columns[key] = col;
  });
  const missingColumns = REQUIRED.filter((key) => !columns[key]);
  if (missingColumns.length) {
    console.error(`✗ أعمدة إجبارية غير موجودة: ${missingColumns.map((k) => LABELS[k]).join("، ")}`);
    process.exit(1);
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw = {};
    for (const [key, col] of Object.entries(columns)) raw[key] = cellText(row.getCell(col).value);
    if (Object.values(raw).every((v) => v === "")) return;
    rows.push({ rowNumber, raw });
  });

  const usedIds = new Set();
  let maxIdNumber = 0;
  for (const { raw } of rows) {
    const match = /^car-(\d+)$/.exec(raw.id ?? "");
    if (match) maxIdNumber = Math.max(maxIdNumber, Number(match[1]));
  }

  const cars = [];
  let generated = 0;

  for (const { rowNumber, raw } of rows) {
    const fail = (key, message) => errors.push(`الصف ${rowNumber}، عمود «${LABELS[key]}»: ${message}`);
    const errorsBefore = errors.length;

    for (const key of REQUIRED) {
      if (!raw[key]) fail(key, "حقل إجباري فارغ");
    }

    const numberField = (key, fallback) => {
      if (!raw[key]) return fallback;
      const n = toNumber(raw[key]);
      if (!Number.isInteger(n) || n < 0) {
        fail(key, `يجب أن يكون رقماً صحيحاً (القيمة الحالية: ${raw[key]})`);
        return fallback;
      }
      return n;
    };
    const year = numberField("year", 0);
    const price = numberField("price", 0);
    const mileage = numberField("mileage", 0);
    const seats = numberField("seats", 5);
    if (raw.year && year && (year < 1990 || year > 2030)) fail("year", "سنة غير منطقية");
    if (raw.price && toNumber(raw.price) === 0) fail("price", "السعر لا يمكن أن يكون صفراً");

    for (const [key, allowed] of Object.entries(ENUMS)) {
      if (raw[key] && !allowed.includes(raw[key])) {
        fail(key, `«${raw[key]}» غير مسموحة. القيم المسموحة: ${allowed.join("، ")}`);
      }
    }

    const featuredText = (raw.featured ?? "").toLowerCase();
    if (!YES.includes(featuredText) && !NO.includes(featuredText)) {
      fail("featured", "اكتب نعم أو لا");
    }

    let id = raw.id;
    if (id && usedIds.has(id)) fail("id", `المعرف ${id} مكرر`);
    if (!id) {
      maxIdNumber += 1;
      id = `car-${String(maxIdNumber).padStart(3, "0")}`;
      generated += 1;
    }
    usedIds.add(id);

    if (errors.length > errorsBefore) continue;

    const images = [];
    for (const name of toList(raw.images ?? "")) {
      if (/^https?:\/\//i.test(name)) {
        warnings.push(`الصف ${rowNumber}: تم تجاهل رابط صورة خارجي (${name}). ضع الصورة داخل public/cars.`);
        continue;
      }
      const path = name.startsWith("/") ? name : `/cars/${name}`;
      if (!existsSync(join(ROOT, "public", path))) {
        warnings.push(`الصف ${rowNumber}: الصورة ${name} غير موجودة في ${IMAGES_DIR} — تم تجاهلها مؤقتاً.`);
        continue;
      }
      images.push(path);
    }

    const condition = raw.condition;
    const status = raw.status || "متوفرة";

    cars.push({
      id,
      brand: raw.brand,
      model: raw.model,
      year,
      price,
      currency: "IQD",
      condition,
      bodyType: raw.bodyType,
      mileage,
      transmission: raw.transmission,
      fuel: raw.fuel,
      engine: raw.engine ?? "",
      seats,
      color: raw.color ?? "",
      city: raw.city,
      status,
      featured: YES.includes(featuredText),
      tags: toList(raw.tags ?? ""),
      description:
        raw.description ||
        `${raw.brand} ${raw.model} ${year} ${condition}، ${raw.transmission}، ${status} في ${raw.city}.`,
      images,
      features: toList(raw.features ?? ""),
    });
  }

  if (errors.length) {
    console.error(`✗ وُجدت ${errors.length} مشكلة — لم يتم تعديل الموقع. صحّحها في ملف الإكسل ثم أعد التشغيل:\n`);
    for (const e of errors) console.error(`  • ${e}`);
    process.exit(1);
  }
  if (cars.length === 0) {
    console.error("✗ الملف لا يحتوي أي سيارة — لم يتم تعديل الموقع.");
    process.exit(1);
  }

  writeFileSync(OUTPUT, JSON.stringify(cars, null, 2) + "\n", "utf8");

  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  console.log(`✓ تم تحديث ${cars.length} سيارة في src/data/cars.json`);
  if (generated) console.log(`  (تم توليد معرفات لـ ${generated} سيارة جديدة — احفظها في الإكسل إذا أردت تثبيتها)`);
}

main().catch((err) => {
  console.error("✗ خطأ غير متوقع أثناء قراءة الملف:", err.message);
  process.exit(1);
});
