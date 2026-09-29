import { Bot, CheckCheck, Phone } from "lucide-react";
import { CarDetailChatCard, CarRecommendationCard } from "./CarRecommendationCard";
import { RichText } from "./RichText";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/cn";
import { MAX_CHAT_CARS, type ChatMessage } from "@/services/ai";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "numeric", minute: "2-digit" });
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const cars = (message.cars ?? []).slice(0, MAX_CHAT_CARS);

  if (isUser) {
    return (
      <div className="flex justify-start animate-fade-in">
        <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-brand-900 px-3.5 pb-1.5 pt-2.5 text-white shadow-sm">
          <p className="whitespace-pre-line text-[15px] font-medium leading-7">{message.content}</p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-white/60">
            {formatTime(message.timestamp)}
            <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="تمت القراءة" />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse items-start gap-2 animate-fade-in">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
        <Bot className="h-3.5 w-3.5" />
      </span>

      <div className="flex min-w-0 max-w-[88%] flex-1 flex-col items-end gap-2">
        <div className="rounded-2xl rounded-tl-md border border-black/[0.04] bg-white px-3.5 pb-1.5 pt-2.5 shadow-sm">
          <div className="text-[15px] font-medium leading-7 text-neutral-800">
            <RichText text={message.content} />
          </div>

          {message.criteria && message.criteria.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.criteria.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-semibold text-brand-800"
                >
                  <bdi>{c}</bdi>
                </span>
              ))}
            </div>
          )}

          <p className="mt-0.5 text-end text-[10.5px] text-neutral-400">{formatTime(message.timestamp)}</p>
        </div>

        {cars.length === 1 && (
          <div className="w-full">
            <CarDetailChatCard car={cars[0]} />
          </div>
        )}
        {cars.length > 1 && (
          <div className="flex w-full flex-col gap-2">
            {cars.map((car) => (
              <CarRecommendationCard key={car.id} car={car} />
            ))}
          </div>
        )}

        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                target={action.kind === "whatsapp" ? "_blank" : undefined}
                rel={action.kind === "whatsapp" ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold shadow-sm transition",
                  action.kind === "whatsapp"
                    ? "bg-[#1fa855] text-white hover:bg-[#1a9149]"
                    : "border border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
                )}
              >
                {action.kind === "whatsapp" ? <WhatsappIcon className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                {action.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
