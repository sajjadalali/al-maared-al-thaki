// The site's own background jobs (19 Nov), started by src/instrumentation.ts:
//
// 1. Every hour the server reads the `upkeep` table. That keeps the free
//    Supabase project active (it pauses after 7 days without requests, and the
//    site would lose its cars), and tells the team on Telegram if the database
//    stops answering.
// 2. Once a week it copies every table to a gzipped JSON file and posts it to
//    Telegram (the free plan has no backups). scripts/restore-backup.mjs turns
//    such a file back into SQL.
//
// The schedule lives in the database, not in memory, so a deploy or restart
// neither skips a backup nor sends it twice.

import { gzipSync } from "node:zlib";
import { site } from "@/config/site";
import type { SupabaseEnv } from "@/server/supabase";
import { sendTelegram, telegramEnv, type TelegramEnv } from "@/server/telegram";

const HOUR = 60 * 60_000;
const BACKUP_EVERY = 7 * 24 * HOUR;
// After a failed backup: try again this much later, so a problem is reported
// a few times a day and not every hour.
const RETRY_AFTER = 6 * HOUR;
// Telegram bots can send files up to 50 MB.
const MAX_FILE = 45 * 1024 * 1024;

/**
 * Every table, in an order that can be restored (a table after the ones it
 * points to), each with the columns of its primary key for paging.
 */
export const BACKUP_TABLES: { name: string; order: string }[] = [
  { name: "brands", order: "id" },
  { name: "models", order: "id" },
  { name: "features", order: "id" },
  { name: "cars", order: "id" },
  { name: "car_images", order: "id" },
  { name: "car_features", order: "car_id,feature_id" },
  { name: "showroom_info", order: "id" },
  { name: "chat_sessions", order: "id" },
  { name: "chat_messages", order: "id" },
  { name: "leads", order: "id" },
  { name: "upkeep", order: "job" },
];

interface UpkeepRow {
  job: string;
  last_ok_at: string | null;
  last_try_at: string | null;
  ok: boolean | null;
  note: string | null;
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), ...extra };
}

async function rest(db: SupabaseEnv & { writeKey: string }, path: string, init: RequestInit = {}) {
  const res = await fetch(`${db.url}/rest/v1/${path}`, {
    ...init,
    headers: headers(db.writeKey, init.headers as Record<string, string>),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function readJob(db: SupabaseEnv & { writeKey: string }, job: string): Promise<UpkeepRow | null> {
  const rows = (await (await rest(db, `upkeep?job=eq.${job}&select=*`)).json()) as UpkeepRow[];
  return rows[0] ?? null;
}

async function writeJob(db: SupabaseEnv & { writeKey: string }, row: UpkeepRow) {
  await rest(db, "upkeep?on_conflict=job", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal,resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
}

/** Every row of every table, a page at a time. */
export async function exportTables(db: SupabaseEnv & { writeKey: string }) {
  const tables: Record<string, unknown[]> = {};
  for (const { name, order } of BACKUP_TABLES) {
    const rows: unknown[] = [];
    // Until a page comes back empty: Supabase may cap a page below the limit
    // asked for, and stopping at a short page would drop the rest silently.
    for (;;) {
      const page = (await (await rest(db, `${name}?select=*&order=${order}&limit=1000&offset=${rows.length}`)).json()) as unknown[];
      if (!page.length) break;
      rows.push(...page);
    }
    tables[name] = rows;
  }
  return tables;
}

async function sendFile(tg: TelegramEnv, file: Uint8Array, filename: string, caption: string) {
  const chatId = process.env.TELEGRAM_BACKUP_CHAT_ID?.trim() || tg.chatIds[0];
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("document", new Blob([new Uint8Array(file)], { type: "application/gzip" }), filename);
  const res = await fetch(`https://api.telegram.org/bot${tg.token}/sendDocument`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Telegram sendDocument: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

const count = (n: number) => n.toLocaleString("en-US");

async function backup(db: SupabaseEnv & { writeKey: string }, tg: TelegramEnv): Promise<string> {
  const now = new Date();
  const tables = await exportTables(db);
  const keys = Object.fromEntries(BACKUP_TABLES.map((t) => [t.name, t.order]));
  const json = JSON.stringify({ format: "maared-backup", version: 1, created_at: now.toISOString(), site: site.url, keys, tables });
  const file = gzipSync(json, { level: 9 });
  if (file.length > MAX_FILE) throw new Error(`the file is ${Math.round(file.length / 1048576)} MB, over Telegram's limit`);
  const day = now.toISOString().slice(0, 10);
  const n = (name: string) => count(tables[name]?.length ?? 0);
  const summary = `${n("cars")} سيارة، ${n("leads")} طلب تواصل، ${n("chat_sessions")} محادثة (${n("chat_messages")} رسالة)`;
  await sendFile(
    tg,
    file,
    `maared-backup-${day}.json.gz`,
    `💾 النسخة الاحتياطية الأسبوعية لقاعدة بيانات ${site.name}، ${day}\n${summary}\nاحتفظ بيها. للاسترجاع: scripts/restore-backup.mjs`
  );
  return `${summary}; ${Math.round(file.length / 1024)} KB`;
}

let alertedAt = 0;
async function alert(tg: TelegramEnv | null, text: string) {
  console.error(`[upkeep] ${text}`);
  // At most one alert every 12 hours from this server.
  if (!tg || Date.now() - alertedAt < 12 * HOUR) return;
  alertedAt = Date.now();
  await sendTelegram(tg, `⚠️ ${site.name}: ${text}`).catch(() => {});
}

let running = false;

/** One hourly round: keeps the database active, and backs it up when due. */
export async function upkeepRound(db: SupabaseEnv & { writeKey: string }, tg: TelegramEnv | null) {
  if (running) return;
  running = true;
  try {
    let job: UpkeepRow | null;
    try {
      job = await readJob(db, "backup");
    } catch (error) {
      await alert(tg, `قاعدة البيانات ما ترد. إذا Supabase وگف المشروع، شغّله من لوحة Supabase. (${String(error).slice(0, 160)})`);
      return;
    }
    if (!tg) return;
    const now = Date.now();
    const lastOk = job?.last_ok_at ? Date.parse(job.last_ok_at) : 0;
    const lastTry = job?.last_try_at ? Date.parse(job.last_try_at) : 0;
    if (now - lastOk < BACKUP_EVERY) return;
    if (job?.ok === false && now - lastTry < RETRY_AFTER) return;

    const tryAt = new Date().toISOString();
    try {
      const note = await backup(db, tg);
      await writeJob(db, { job: "backup", last_ok_at: tryAt, last_try_at: tryAt, ok: true, note });
      console.log(`[upkeep] backup sent: ${note}`);
    } catch (error) {
      const note = String(error).slice(0, 300);
      await writeJob(db, { job: "backup", last_ok_at: job?.last_ok_at ?? null, last_try_at: tryAt, ok: false, note }).catch(() => {});
      await alert(tg, `النسخة الاحتياطية الأسبوعية فشلت، وراح تنعاد بعد 6 ساعات. (${note.slice(0, 160)})`);
    }
  } finally {
    running = false;
  }
}

let started = false;

/** Starts the hourly round, once per server; does nothing without the secret key. */
export function startUpkeep(db: SupabaseEnv | null) {
  if (started || !db?.writeKey) return;
  started = true;
  const env = { ...db, writeKey: db.writeKey };
  const round = () => void upkeepRound(env, telegramEnv()).catch((error) => console.error("[upkeep]", error));
  // A few minutes after the server starts, so a deploy is settled first.
  setTimeout(round, 3 * 60_000).unref();
  setInterval(round, HOUR).unref();
}
