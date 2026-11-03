// Telegram messages to the sales team, through the Bot API. Import only from
// server code: it reads the bot token from the environment.

import { site } from "@/config/site";
import { formatIQD } from "@/lib/format";

export interface TelegramEnv {
  token: string;
  /** One chat (a group's id is negative, e.g. -1001234567890) or several, comma-separated. */
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
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const baghdadTime = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
  timeZone: "Asia/Baghdad",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

/** "0783 854 8091", the way the team dials it. */
function spaced(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
}

export function leadText(lead: LeadNotice, now = new Date()): string {
  const whatsapp = `https://wa.me/964${lead.phone.slice(1)}`;
  const lines = [
    "🔔 <b>زبون جديد من سديم</b>",
    "",
    lead.name ? `👤 ${escape(lead.name)}` : null,
    `📱 <code>${spaced(lead.phone)}</code> · <a href="${whatsapp}">واتساب</a>`,
    lead.car
      ? `🚗 <a href="${site.url}/cars/${encodeURIComponent(lead.car.id)}">${escape(lead.car.label)}</a>${
          lead.car.priceIqd ? ` · ${formatIQD(lead.car.priceIqd)}` : ""
        }`
      : null,
    lead.note ? `📝 ${escape(lead.note)}` : null,
    lead.message ? `💬 «${escape(lead.message.slice(0, 300))}»` : null,
    "",
    `🕒 ${baghdadTime.format(now)}`,
  ];
  return lines.filter((line) => line !== null).join("\n");
}

/** Sends `text` (Telegram HTML) to every chat; true when at least one got it. */
export async function sendTelegram(env: TelegramEnv, text: string): Promise<boolean> {
  const results = await Promise.all(
    env.chatIds.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${env.token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
          signal: AbortSignal.timeout(5_000),
          cache: "no-store",
        });
        if (!res.ok) console.error(`Telegram sendMessage to ${chatId}: ${res.status} ${await res.text()}`);
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
  return env ? sendTelegram(env, leadText(lead)) : Promise.resolve(false);
}
