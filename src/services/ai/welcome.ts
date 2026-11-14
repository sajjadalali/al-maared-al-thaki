import { phoneHref, site, whatsappHref } from "@/config/site";
import type { ChatMessage } from "./types";

/** Suggestions under Sadeem's opening message (and under the rule-based fallback's questions). */
export const DEFAULT_QUICK_REPLIES = [
  "أريد سيارة اقتصادية",
  "أريد SUV عائلية",
  "أريد سيارة فخمة",
  "شنو أرخص سيارة عندكم؟",
];

function assistantMessage(content: string, extras: Partial<ChatMessage> = {}): ChatMessage {
  return { id: `msg-${Date.now()}`, role: "assistant", content, timestamp: new Date().toISOString(), ...extras };
}

/** The opening message shown when the chat is first opened. */
export function welcomeMessage(): ChatMessage {
  return assistantMessage(
    `هلا وغلا 👋 آني **سديم**، موظف المبيعات ب${site.name}.\nگلّي شنو السيارة اللي تدوّرها أو ميزانيتك، وألگيلك أفضل خيار من سياراتنا المتوفرة.`,
    { quickReplies: DEFAULT_QUICK_REPLIES }
  );
}

/** Shown when the chat can't reach the server, so the buyer still has a way to ask. */
export function offlineMessage(rateLimited = false): ChatMessage {
  return assistantMessage(
    rateLimited
      ? "وصلت رسايلك للحد المسموح هسه، جرّب بعد شوية، أو راسلنا مباشرة 👇"
      : "صار خلل بالاتصال وما گدرت أجاوبك هسه 🙏 جرّب مرة ثانية، أو راسلنا مباشرة 👇",
    {
      actions: [
        { kind: "whatsapp", label: "راسلنا واتساب", href: whatsappHref("مرحباً، عندي استفسار عن سيارة") },
        { kind: "phone", label: "اتصال", href: phoneHref },
      ],
    }
  );
}
