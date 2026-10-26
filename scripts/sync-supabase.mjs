// Copies the catalog the site uses (src/data/cars.json, from content/cars.xlsx)
// into Supabase: makes, models with the Arabic names buyers type, cars,
// equipment and photos with their credits. Safe to re-run: rows are upserted,
// and each car's equipment and photos are replaced with the file's.
//
// Usage:
//   npm run sync-supabase                  push to SUPABASE_URL with SUPABASE_SECRET_KEY
//   npm run sync-supabase -- --sql FILE    write the same data as SQL instead (seed file)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const cars = read("src/data/cars.json");
const aliases = read("src/data/car-aliases.json");
const brandLabels = read("src/data/brand-labels.json");
const credits = read("src/data/image-credits.json");

// Same rules as normalizeArabic() in src/lib/carAliases.ts and normalize_ar() in SQL.
function normalize(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}
const slug = (text) => normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hasArabic = (text) => /[؀-ۿ]/.test(text);
const unique = (values) => [...new Set(values.filter(Boolean))];

// A model takes the aliases written for exactly its name, otherwise those of
// every alias entry its name contains ("Tiggo 8 Pro Max" -> "tiggo").
function modelAliases(model) {
  const name = model.toLowerCase();
  const exact = aliases.models.filter((m) => m.model === name);
  const entries = exact.length ? exact : aliases.models.filter((m) => name.includes(m.model));
  return unique(entries.flatMap((m) => m.aliases).map(normalize));
}

function buildRows() {
  const brands = new Map();
  const models = new Map();
  const features = new Set();
  const carRows = [];
  const carFeatures = [];
  const carImages = [];

  for (const car of cars) {
    const brandId = slug(car.brand);
    if (!brands.has(brandId)) {
      const entry = aliases.brands.find((b) => b.brand === car.brand);
      brands.set(brandId, {
        id: brandId,
        name: car.brand,
        name_ar: brandLabels[car.brand] ?? car.brand,
        aliases: unique((entry?.aliases ?? []).map(normalize)),
        is_chinese: aliases.chineseBrands.includes(car.brand),
      });
    }
    const modelId = `${brandId}-${slug(car.model)}`;
    if (!models.has(modelId)) {
      const modelAliasList = modelAliases(car.model);
      models.set(modelId, {
        id: modelId,
        brand_id: brandId,
        name: car.model,
        name_ar: modelAliasList.find(hasArabic) ?? null,
        aliases: modelAliasList,
      });
    }

    carRows.push({
      id: car.id,
      model_id: modelId,
      trim_level: car.trim ?? null,
      year: car.year,
      price_iqd: car.price,
      condition: car.condition,
      origin: car.origin ?? null,
      body_type: car.bodyType,
      mileage_km: car.mileage,
      transmission: car.transmission,
      fuel: car.fuel,
      engine: car.engine ?? "",
      cylinders: car.cylinders ?? null,
      horsepower: car.horsepower ?? null,
      drivetrain: car.drivetrain ?? null,
      seats: car.seats,
      color: car.color ?? "",
      city: car.city,
      status: car.status,
      featured: Boolean(car.featured),
      tags: car.tags ?? [],
      description: car.description ?? "",
    });

    car.features.forEach((name, i) => {
      features.add(name);
      carFeatures.push({ car_id: car.id, feature: name, position: i + 1 });
    });

    car.images.forEach((path, i) => {
      const credit = credits[path];
      carImages.push({
        car_id: car.id,
        position: i + 1,
        path,
        author: credit?.author ?? null,
        license: credit?.license ?? null,
        license_url: credit?.licenseUrl ?? null,
        source_url: credit?.source ?? null,
      });
    });
  }

  return {
    brands: [...brands.values()],
    models: [...models.values()],
    features: [...features].map((name) => ({ name })),
    cars: carRows,
    carFeatures,
    carImages,
  };
}

// ---------------------------------------------------------------------------
// SQL output
// ---------------------------------------------------------------------------
function sqlValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.length ? `array[${value.map(sqlValue).join(", ")}]::text[]` : "'{}'::text[]";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function upsertSql(table, rows, conflict) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const values = rows.map((row) => `  (${columns.map((c) => sqlValue(row[c])).join(", ")})`).join(",\n");
  const updates = columns.filter((c) => !conflict.includes(c)).map((c) => `${c} = excluded.${c}`);
  return (
    `insert into public.${table} (${columns.join(", ")}) values\n${values}\n` +
    `on conflict (${conflict.join(", ")}) do ${updates.length ? `update set ${updates.join(", ")}` : "nothing"};\n`
  );
}

function toSql(data) {
  const ids = data.cars.map((c) => sqlValue(c.id)).join(", ");
  return [
    "-- Generated by `npm run sync-supabase -- --sql` from src/data/cars.json. Do not edit by hand.",
    "begin;",
    upsertSql("brands", data.brands, ["id"]),
    upsertSql("models", data.models, ["id"]),
    upsertSql("features", data.features, ["name"]),
    upsertSql("cars", data.cars, ["id"]),
    `delete from public.car_features where car_id in (${ids});`,
    `insert into public.car_features (car_id, feature_id, position)\nselect v.car_id, f.id, v.position from (values\n${data.carFeatures
      .map((r) => `  (${sqlValue(r.car_id)}, ${sqlValue(r.feature)}, ${r.position})`)
      .join(",\n")}\n) as v(car_id, feature, position)\njoin public.features f on f.name = v.feature;`,
    `delete from public.car_images where car_id in (${ids});`,
    upsertSql("car_images", data.carImages, ["car_id", "position"]),
    "commit;",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// REST (PostgREST) output
// ---------------------------------------------------------------------------
async function push(data) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("✗ ضع SUPABASE_URL و SUPABASE_SECRET_KEY في متغيرات البيئة (أو استخدم --sql).");
    process.exit(1);
  }
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`; // legacy service_role JWT

  async function call(method, path, body, prefer) {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json().catch(() => null);
  }
  const upsert = (table, rows, conflict) =>
    rows.length &&
    call("POST", `${table}?on_conflict=${conflict}`, rows, "resolution=merge-duplicates,return=minimal");

  await upsert("brands", data.brands, "id");
  await upsert("models", data.models, "id");
  const features = await call(
    "POST",
    "features?on_conflict=name&select=id,name",
    data.features,
    "resolution=merge-duplicates,return=representation"
  );
  const featureId = new Map(features.map((f) => [f.name, f.id]));
  await upsert("cars", data.cars, "id");

  const ids = data.cars.map((c) => c.id).join(",");
  await call("DELETE", `car_features?car_id=in.(${ids})`);
  await call(
    "POST",
    "car_features",
    data.carFeatures.map((r) => ({ car_id: r.car_id, feature_id: featureId.get(r.feature), position: r.position })),
    "return=minimal"
  );
  await call("DELETE", `car_images?car_id=in.(${ids})`);
  await call("POST", "car_images", data.carImages, "return=minimal");

  const inDb = await call("GET", "cars?select=id");
  const extra = inDb.map((c) => c.id).filter((id) => !data.cars.some((c) => c.id === id));
  if (extra.length) console.warn(`⚠ سيارات موجودة في Supabase وليست في الملف (لم تُحذف): ${extra.join("، ")}`);
}

const data = buildRows();
const sqlIndex = process.argv.indexOf("--sql");
if (sqlIndex !== -1) {
  const out = resolve(process.argv[sqlIndex + 1] ?? join(ROOT, "supabase", "seed.sql"));
  writeFileSync(out, toSql(data), "utf8");
  console.log(`✓ كُتب ${out}`);
} else {
  await push(data).catch((err) => {
    console.error("✗", err.message);
    process.exit(1);
  });
  console.log("✓ تمت المزامنة مع Supabase");
}
console.log(
  `  ${data.brands.length} ماركة، ${data.models.length} موديل، ${data.cars.length} سيارة، ` +
    `${data.features.length} تجهيز، ${data.carImages.length} صورة`
);
