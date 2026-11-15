// Telegram alerts to the sales team's channel, through the Bot API. Import only from
// server code: it reads the bot token from the environment.

import { site } from "@/config/site";
import { formatIQD } from "@/lib/format";

export interface TelegramEnv {
  token: string;
  /**
   * Where alerts go: a channel's id (-1001234567890) or a public channel's
   * @username, or several of them comma-separated. The bot must be an admin
   * of the channel that can post messages. Groups and private chats work too.
   */
  chatIds: string[];
}

export function telegramEnv(): TelegramEnv | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return token && chatIds.length ? { token, chatIds } : null;
}

/** A buyer who left a number, as the sales team reads it. */
export interface LeadNotice {
  /** 07XXXXXXXXX */
  phone: string;
  name?: string | null;
  car?: { id: string; label: string; priceIqd?: number } | null;
  /** What they want, as Sadeem noted it. */
  note?: string | null;
  /** The buyer's own message that gave the number. */
  message?: string | null;
  /** Where it came from: Sadeem (default) or the contact page's form. */
  source?: "chat" | "form";
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// «الأحد 15 تشرين الثاني 2026 | 6:01 ص»: the day and date, then the time after a bar.
const baghdadDate = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
  timeZone: "Asia/Baghdad",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const baghdadTime = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
  timeZone: "Asia/Baghdad",
  hour: "numeric",
  minute: "2-digit",
});
export const noticeTime = (now: Date) => `${baghdadDate.format(now).replace("،", "")} | ${baghdadTime.format(now)}`;

// Arabic-Indic and Persian digits («٠٧٨٦١٦٨٨٧٧٣») as 0-9, so the team reads
// and copies the buyer's message as it would type it.
export const westernDigits = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

/**
 * withCall: a «اتصال» link (tel:) beside WhatsApp, so the team calls the buyer
 * with one tap. sendTelegram sends the notice again without it if Telegram
 * refuses the message, so the lead always arrives.
 */
export function leadText(lead: LeadNotice, now = new Date(), withCall = true): string {
  const international = `964${lead.phone.slice(1)}`;
  const whatsapp = `https://wa.me/${international}`;
  const lines = [
    lead.source === "form" ? "🔔 <b>طلب جديد من صفحة التواصل</b>" : "🔔 <b>زبون جديد من سديم</b>",
    "",
    lead.name ? `👤 ${escape(lead.name)}` : null,
    // One unbroken number: spaced groups show out of order in an Arabic line
    // (tried: plain spaces, and an LTR embedding around them). In <code> it copies with one tap.
    `📱 <code>${lead.phone}</code> · <a href="${whatsapp}">واتساب</a>${withCall ? ` · <a href="tel:+${international}">اتصال</a>` : ""}`,
    lead.car
      ? `🚗 <a href="${site.url}/cars/${encodeURIComponent(lead.car.id)}">${escape(lead.car.label)}</a>${
          lead.car.priceIqd ? ` · ${formatIQD(lead.car.priceIqd)}` : ""
        }`
      : null,
    lead.note ? `📝 ${escape(lead.note)}` : null,
    lead.message ? `💬 «${escape(westernDigits(lead.message).slice(0, 300))}»` : null,
    "",
    `🕒 ${noticeTime(now)}`,
  ];
  return lines.filter((line) => line !== null).join("\n");
}

/**
 * Sends `text` (Telegram HTML) to every chat; true when at least one got it.
 * `fallback`: sent instead to a chat that refuses `text` with 400 (bad markup
 * or a link Telegram won't take), so the message still arrives.
 */
export async function sendTelegram(env: TelegramEnv, text: string, fallback?: string): Promise<boolean> {
  const results = await Promise.all(
    env.chatIds.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${env.token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
          // Generous: the notice is sent after the buyer has the reply, and from
          // the server Telegram has taken over 5 s to answer (the post still landed).
          signal: AbortSignal.timeout(20_000),
          cache: "no-store",
        });
        if (!res.ok) console.error(`Telegram sendMessage to ${chatId}: ${res.status} ${await res.text()}`);
        if (res.status === 400 && fallback && fallback !== text) {
          return sendTelegram({ ...env, chatIds: [chatId] }, fallback);
        }
        return res.ok;
      } catch (error) {
        console.error(`Telegram sendMessage to ${chatId}:`, error);
        return false;
      }
    })
  );
  return results.some(Boolean);
}

/** Tells the sales team about a new lead; false when Telegram is not set up or unreachable. */
export function notifyLead(lead: LeadNotice): Promise<boolean> {
  const env = telegramEnv();
  if (!env) return Promise.resolve(false);
  const now = new Date();
  return sendTelegram(env, leadText(lead, now), leadText(lead, now, false));
}
