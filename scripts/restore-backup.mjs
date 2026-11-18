// Turns a weekly backup (maared-backup-YYYY-MM-DD.json.gz, posted to Telegram
// by src/server/upkeep.ts) back into SQL:
//
//   node scripts/restore-backup.mjs maared-backup-2026-11-19.json.gz > restore.sql
//
// Then, on an empty project: apply supabase/migrations (in order), then run
// restore.sql (Supabase SQL editor, or psql). A row that already exists (the
// migrations add the showroom's policies) takes the backup's values, so
// running it twice is harmless. Meant for an empty project: on a live one it
// would put back older versions of rows changed since the backup.
// With --summary it prints what the backup holds instead.

import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error("Usage: node scripts/restore-backup.mjs <backup.json.gz> [--summary]");
  process.exit(1);
}

const raw = readFileSync(file);
const backup = JSON.parse((file.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8"));
if (backup.format !== "maared-backup" || backup.version !== 1 || typeof backup.tables !== "object") {
  console.error("Not a backup of this site (format maared-backup, version 1).");
  process.exit(1);
}

if (rest.includes("--summary")) {
  console.log(`Backup of ${backup.site}, ${backup.created_at}`);
  for (const [name, rows] of Object.entries(backup.tables)) console.log(`  ${name}: ${rows.length}`);
  process.exit(0);
}

// The tables come in the order they can be restored (the backup writes them so).
const TAG = "$maared_backup$";
// Primary keys, from the backup (or these, for the tables it has always had).
const KEYS = { car_features: "car_id,feature_id", upkeep: "job", ...(backup.keys ?? {}) };
const BATCH = 500;
const out = [`-- Restore of ${backup.site} from ${backup.created_at}`, "begin;"];

const names = Object.keys(backup.tables);
for (const name of names) if (!/^[a-z_]+$/.test(name)) throw new Error(`bad table name ${name}`);
// The tables' own triggers (showroom_info sets updated_at) would change the
// restored rows; foreign keys are still checked.
out.push(...names.map((name) => `alter table public.${name} disable trigger user;`));

for (const [name, rows] of Object.entries(backup.tables)) {
  out.push(`\n-- ${name}: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const json = JSON.stringify(batch);
    const key = (KEYS[name] ?? "id").split(",");
    const columns = Object.keys(batch[0]).filter((c) => !key.includes(c));
    if (![...key, ...columns].every((c) => /^[a-z_0-9]+$/.test(c))) throw new Error(`bad column in ${name}`);
    const onConflict = columns.length
      ? `on conflict (${key.join(", ")}) do update set ${columns.map((c) => `${c} = excluded.${c}`).join(", ")};`
      : "on conflict do nothing;";
    if (json.includes(TAG)) throw new Error(`${name} holds the text ${TAG}`);
    // The rows as JSON, read with the table's own column types, so arrays,
    // jsonb and timestamps come back as they were.
    out.push(
      `insert into public.${name} overriding system value\n` +
        `select * from jsonb_populate_recordset(null::public.${name}, ${TAG}${json}${TAG}::jsonb)\n` +
        onConflict
    );
  }
}

// Identity columns carry on after the restored ids.
out.push("\n-- identity columns continue after the restored rows");
out.push(`do $$
declare r record;
begin
  for r in
    select c.table_name, c.column_name from information_schema.columns c
    where c.table_schema = 'public' and c.is_identity = 'YES'
  loop
    execute format(
      'select setval(pg_get_serial_sequence(%L, %L), coalesce((select max(%I) from public.%I), 0) + 1, false)',
      'public.' || r.table_name, r.column_name, r.column_name, r.table_name
    );
  end loop;
end $$;`);
out.push(...names.map((name) => `alter table public.${name} enable trigger user;`));
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
