// Saves an error a visitor hit (20 Nov) to `site_errors`, from the browser
// (/api/site-errors) or from the server (onRequestError). It is also printed,
// so it shows in Coolify's log when Supabase is not configured or fails.
import { insert, supabaseEnv } from "@/server/supabase";

export interface SiteError {
  side: "browser" | "server";
  kind: string;
  message?: string | null;
  detail?: string | null;
  page?: string | null;
  userAgent?: string | null;
  extra?: Record<string, unknown> | null;
}

const clip = (value: unknown, max: number) => (typeof value === "string" && value ? value.slice(0, max) : null);

// However many errors come in, at most this many rows an hour, so a broken
// release (or someone posting junk) can't fill the free database.
const HOURLY_CAP = 300;
let hour = 0;
let savedThisHour = 0;

export async function saveSiteError(error: SiteError): Promise<void> {
  const row = {
    side: error.side,
    kind: clip(error.kind, 60) ?? "unknown",
    message: clip(error.message, 1000),
    detail: clip(error.detail, 6000),
    page: clip(error.page, 500),
    user_agent: clip(error.userAgent, 400),
    extra: error.extra ?? null,
  };
  console.error(`[site-error] ${row.side} ${row.kind} ${row.page ?? ""}: ${row.message ?? ""}`);

  const now = Math.floor(Date.now() / 3_600_000);
  if (now !== hour) {
    hour = now;
    savedThisHour = 0;
  }
  if (++savedThisHour > HOURLY_CAP) return;

  const db = supabaseEnv();
  if (!db) return;
  await insert(db, "site_errors", row).catch((failure) => console.error("Saving a site error:", failure));
}
