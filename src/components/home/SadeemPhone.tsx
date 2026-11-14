import { BatteryFull, SendHorizontal, Signal, Wifi } from "lucide-react";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import type { Catalog } from "@/data/cars";
import { getCatalog } from "@/server/catalog";
import { carCount, carNameAr, originLabel } from "@/lib/format";
import { carMarker } from "@/services/ai/carMarkers";
import type { ChatMessage } from "@/services/ai";
import type { Car } from "@/types/car";

const BUDGET = 50_000_000;
const QUESTION = "أريد سيارة عائلية 7 مقاعد بحدود 50 مليون";
// What the reply offers next. Each opens a new chat, so each stands on its own.
const FOLLOW_UPS = ["أريد أحجز تجربة قيادة", "عندكم 7 مقاعد أرخص من 40 مليون؟"];

// Sadeem's answer to QUESTION, built from the stock the way the chat shows it:
// the cars that fit, dearest first (a «بحدود» budget), each with its own line.
function conversation({ getAllCars }: Catalog): ChatMessage[] | null {
  const fit = getAllCars()
    .filter((car) => car.status === "متوفرة" && car.seats >= 7 && car.price <= BUDGET)
    .sort((a, b) => b.price - a.price);
  if (fit.length === 0) return null;
  const shown = fit.slice(0, 3);
  const line = (car: Car) =>
    [car.condition === "جديدة" ? "زيرو" : "مستعملة", car.origin && originLabel(car.origin), `${car.seats} مقاعد`]
      .filter(Boolean)
      .join(" · ");
  const blocks = shown.map((car) => `**${carNameAr(car)} ${car.year}**\n${line(car)}\n${carMarker(car.id)}`);
  const at = "2026-01-01T10:24:00";
  return [
    { id: "q", role: "user", content: QUESTION, timestamp: at },
    {
      id: "a",
      role: "assistant",
      content: [
        `عدنا ${carCount(fit.length)} عائلية 7 مقاعد ضمن 50 مليون، وهذي الأقرب لميزانيتك:`,
        ...blocks,
        "تحب أرتّبلك تجربة قيادة لوحدة منهن؟",
      ].join("\n\n"),
      timestamp: at,
      cars: shown,
    },
  ];
}

/**
 * A phone running the real chat: the same bubbles and car cards as the site's
 * chat, with a reply built from the stock, so every car in it is real and opens
 * its page. The input and the suggestions open the chat itself.
 */
export async function SadeemPhone() {
  const messages = conversation(await getCatalog());

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="rounded-[48px] bg-[#05080f] p-[10px] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
        <div className="relative flex h-[760px] flex-col overflow-hidden rounded-[38px] bg-surface">
          {/* status bar and the island */}
          <div dir="ltr" className="flex h-11 shrink-0 items-center justify-between bg-brand-950 px-7 pt-1 text-white">
            <span className="text-[13px] font-semibold">10:24</span>
            <span className="flex items-center gap-1.5">
              <Signal className="h-3.5 w-3.5" />
              <Wifi className="h-3.5 w-3.5" />
              <BatteryFull className="h-4 w-4" />
            </span>
          </div>
          <span aria-hidden className="absolute left-1/2 top-2.5 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />

          {/* the chat's own header */}
          <div className="flex shrink-0 items-center gap-2.5 bg-brand-950 px-4 pb-3 pt-1 text-white">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <SadeemMascot className="h-8 w-8" />
              <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-brand-950 bg-success" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold leading-5">سديم</span>
              <span className="block text-[11.5px] leading-5 text-white/65">متصل الآن</span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-3 pb-3 pt-4">
            {messages ? (
              messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
            ) : (
              <ChatMessageBubble
                message={{ id: "w", role: "assistant", content: "هلا بيك! گلّي شنو تدوّر عليه وشكد ميزانيتك.", timestamp: "2026-01-01T10:24:00" }}
              />
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-black/5 bg-white px-3 py-2.5">
            {FOLLOW_UPS.map((prompt) => (
              <OpenChatButton
                key={prompt}
                prompt={prompt}
                className="min-h-10 rounded-full border border-brand-200 bg-brand-50/70 px-3.5 text-[12.5px] font-semibold text-brand-800 transition hover:bg-brand-100"
              >
                {prompt}
              </OpenChatButton>
            ))}
          </div>

          <div className="shrink-0 bg-white px-3 pb-5 pt-1">
            <OpenChatButton className="flex min-h-11 w-full items-center gap-2 rounded-full bg-surface ps-4 pe-1.5 text-start text-[14px] text-neutral-400 transition hover:bg-surface-muted">
              <span className="flex-1">اكتب رسالتك هنا...</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-white">
                <SendHorizontal className="h-4 w-4 -scale-x-100" />
              </span>
            </OpenChatButton>
          </div>
          <span aria-hidden className="absolute bottom-1.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-brand-950/80" />
        </div>
      </div>
    </div>
  );
}
