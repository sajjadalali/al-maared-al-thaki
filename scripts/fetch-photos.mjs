// Downloads the licensed Wikimedia Commons photos listed in the «الصور» sheet of
// the research workbook into public/cars (webp), writes their names into the
// «الصور» column of content/cars.xlsx and saves their attribution to
// src/data/image-credits.json. Run `npm run import-cars` afterwards.
// Usage: npm run fetch-photos [-- path/to/research.xlsx] [-- --force]
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH_DIR = join(ROOT, "content", "research");
const CARS_FILE = join(ROOT, "content", "cars.xlsx");
const IMAGES_DIR = join(ROOT, "public", "cars");
const CREDITS_FILE = join(ROOT, "src", "data", "image-credits.json");

// Wikimedia asks automated clients to identify themselves.
const USER_AGENT = "al-maared-al-thaki-fetch-photos/1.0 (https://github.com/sajjadalali/al-maared-al-thaki)";
// 1920 is one of Wikimedia's standard thumbnail widths; the site needs at most 1600.
const REQUEST_WIDTH = 1920;
const MAX_WIDTH = 1600;
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const force = args.includes("--force");
const researchArg = args.find((a) => !a.startsWith("--"));

function latestResearchFile() {
  if (!existsSync(RESEARCH_DIR)) return null;
  const files = readdirSync(RESEARCH_DIR)
    .filter((f) => /^cars-research-.*\.xlsx$/.test(f))
    .sort();
  return files.length ? join(RESEARCH_DIR, files.at(-1)) : null;
}

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return cellText(value.result);
  }
  return String(value).trim();
}

function columnsOf(sheet) {
  const columns = {};
  sheet.getRow(1).eachCell((cell, col) => {
    columns[cellText(cell.value).replace(/\*/g, "").trim()] = col;
  });
  return columns;
}

// "CC BY-SA 3.0 de" → https://creativecommons.org/licenses/by-sa/3.0/de/
function licenseUrl(license) {
  if (/^CC0/i.test(license)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  const match = /^CC (BY(?:-SA)?) (\d\.\d)(?: ([a-z]{2}))?$/i.exec(license);
  if (!match) return undefined;
  const [, kind, version, port] = match;
  return `https://creativecommons.org/licenses/${kind.toLowerCase()}/${version}/${port ? `${port.toLowerCase()}/` : ""}`;
}

const commonsName = (file) => file.trim().replace(/ /g, "_");
const pageUrl = (file) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(commonsName(file))}`;
const downloadUrl = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsName(file))}?width=${REQUEST_WIDTH}`;

async function download(photo) {
  const target = join(IMAGES_DIR, photo.siteName);
  if (existsSync(target) && !force) return "exists";
  const response = await fetch(downloadUrl(photo.file), { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error("الرد ليس صورة");
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(target);
  return "downloaded";
}

async function main() {
  const researchFile = researchArg ? resolve(researchArg) : latestResearchFile();
  if (!researchFile || !existsSync(researchFile)) {
    console.error(`✗ لم يتم العثور على ملف البحث${researchArg ? `: ${researchFile}` : " داخل content/research"}`);
    process.exit(1);
  }

  const research = new ExcelJS.Workbook();
  await research.xlsx.readFile(researchFile);
  const sheet = research.getWorksheet("الصور");
  if (!sheet) {
    console.error("✗ لا توجد ورقة باسم «الصور» داخل ملف البحث.");
    process.exit(1);
  }
  const col = columnsOf(sheet);
  const needed = ["المعرف", "اسم الملف في ويكيميديا", "المصوّر", "الرخصة", "اسم الملف بالموقع"];
  const missing = needed.filter((h) => !col[h]);
  if (missing.length) {
    console.error(`✗ أعمدة غير موجودة في ورقة «الصور»: ${missing.join("، ")}`);
    process.exit(1);
  }

  const photos = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const get = (h) => cellText(row.getCell(col[h]).value);
    const photo = {
      carId: get("المعرف"),
      file: get("اسم الملف في ويكيميديا"),
      author: get("المصوّر"),
      license: get("الرخصة"),
      siteName: get("اسم الملف بالموقع"),
    };
    if (photo.carId && photo.file && photo.siteName) photos.push(photo);
  });

  mkdirSync(IMAGES_DIR, { recursive: true });
  const failed = [];
  let downloaded = 0;
  let queue = 0;
  async function worker() {
    while (queue < photos.length) {
      const photo = photos[queue++];
      try {
        if ((await download(photo)) === "downloaded") {
          downloaded += 1;
          console.log(`  ✓ ${photo.siteName}`);
        }
      } catch (err) {
        failed.push(photo);
        console.warn(`  ⚠ ${photo.siteName} (${photo.file}): ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ready = photos.filter((p) => existsSync(join(IMAGES_DIR, p.siteName)));

  const credits = {};
  for (const p of ready) {
    credits[`/cars/${p.siteName}`] = {
      author: p.author,
      license: p.license,
      licenseUrl: licenseUrl(p.license),
      source: pageUrl(p.file),
    };
  }
  writeFileSync(CREDITS_FILE, JSON.stringify(credits, null, 2) + "\n", "utf8");

  // Each car keeps the showroom's own photos first, followed by its Commons
  // photos; names from earlier runs whose row was deleted are dropped.
  const cars = new ExcelJS.Workbook();
  await cars.xlsx.readFile(CARS_FILE);
  const carsSheet = cars.getWorksheet("السيارات");
  const carsCol = carsSheet ? columnsOf(carsSheet) : {};
  if (!carsCol["المعرف"] || !carsCol["الصور"]) {
    console.error("✗ ملف content/cars.xlsx يجب أن يحتوي ورقة «السيارات» بعمودي «المعرف» و«الصور».");
    process.exit(1);
  }
  let updatedCars = 0;
  carsSheet.eachRow((row, n) => {
    if (n === 1) return;
    const id = cellText(row.getCell(carsCol["المعرف"]).value);
    if (!id) return;
    const managed = new RegExp(`^${id}-\\d+\\.webp$`);
    const cell = row.getCell(carsCol["الصور"]);
    const own = cellText(cell.value)
      .split(/[،,|\n]+/)
      .map((s) => s.trim())
      .filter((s) => s && !managed.test(s));
    const value = [...own, ...ready.filter((p) => p.carId === id).map((p) => p.siteName)].join("، ");
    if (value !== cellText(cell.value)) {
      cell.value = value || null;
      updatedCars += 1;
    }
  });
  await cars.xlsx.writeFile(CARS_FILE);

  console.log(
    `\n✓ ${ready.length} صورة جاهزة (${downloaded} تم تحميلها الآن) · تم تحديث عمود «الصور» لـ ${updatedCars} سيارة`
  );
  if (failed.length) console.warn(`⚠ تعذّر تحميل ${failed.length} صورة — أعد التشغيل لاحقاً لإكمالها.`);
  console.log("الخطوة التالية: npm run import-cars   (على ويندوز: npm.cmd run import-cars)");
}

main().catch((err) => {
  console.error("✗ خطأ غير متوقع:", err.message);
  process.exit(1);
});
