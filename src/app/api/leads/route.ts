import { after } from "next/server";
import { iraqiMobile, isShowroomNumber } from "@/lib/phone";
import { insert, supabaseEnv } from "@/server/supabase";
import { notifyLead, type LeadNotice } from "@/server/telegram";

// The contact page's form: a request the sales team calls back, kept in
// `leads` (source "form", which the table allows) and sent to Telegram like the ones Sadeem saves.

const MAX_NAME = 80;
const MAX_MESSAGE = 1000;

// A few requests per visitor, so the form can't flood the table or the channel.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * POST { name, phone, message } → { ok: true } once the request is stored or
 * the team was told on Telegram; 400 { error: "bad_phone" | "showroom_phone" |
 * "missing_name" } for what the visitor can fix; 503 when neither worked (the
 * form then hands the message to WhatsApp, so nothing is lost).
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const name = text(body?.name, MAX_NAME);
  const message = text(body?.message, MAX_MESSAGE);
  const phone = iraqiMobile(text(body?.phone, 40));
  if (!name) return Response.json({ error: "missing_name" }, { status: 400 });
  if (!phone) return Response.json({ error: "bad_phone" }, { status: 400 });
  if (isShowroomNumber(phone)) return Response.json({ error: "showroom_phone" }, { status: 400 });

  const notice: LeadNotice = { phone, name, message: message || null, source: "form" };
  const db = supabaseEnv();
  const stored = db
    ? await insert(db, "leads", { phone, name, car_id: null, message: message || null, source: "form" }).catch((error) => {
        console.error("Saving contact lead:", error);
        return false;
      })
    : false;
  // Stored: Telegram goes out after the visitor has the answer (it has taken
  // over 5 s). Not stored: Telegram is the only copy, so wait for it.
  if (stored) {
    after(() => notifyLead(notice).then((ok) => ok || console.error(`Telegram notice for contact lead ${phone} not confirmed`)));
    return Response.json({ ok: true });
  }
  return (await notifyLead(notice)) ? Response.json({ ok: true }) : Response.json({ error: "unavailable" }, { status: 503 });
}
