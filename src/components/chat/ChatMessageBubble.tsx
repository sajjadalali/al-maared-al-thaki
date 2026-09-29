import { Bot, Phone } from "lucide-react";
import { CarRecommendationCard } from "./CarRecommendationCard";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/services/ai";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "numeric", minute: "2-digit" });
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div className="flex max-w-[85%] items-end gap-2">
        {!isUser && (
          <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
            <Bot className="h-3.5 w-3.5" />
          </span>
        )}
        <div
          className={cn(
            "animate-fade-in whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-7",
            isUser
              ? "rounded-tl-sm bg-brand-900 text-white"
              : "rounded-tr-sm border border-black/5 bg-surface text-brand-950"
          )}
        >
          {message.content}
        </div>
      </div>
      <span className={cn("px-1 text-[10px] text-neutral-400", isUser ? "me-1" : "ms-9")}>
        {formatTime(message.timestamp)}
      </span>

      {message.cars && message.cars.length > 0 && (
        <div className="no-scrollbar ms-9 flex max-w-[92%] gap-2.5 overflow-x-auto pb-1 pt-0.5">
          {message.cars.map((car) => (
            <CarRecommendationCard key={car.id} car={car} />
          ))}
        </div>
      )}

      {message.actions && message.actions.length > 0 && (
        <div className="ms-9 flex flex-wrap gap-2">
          {message.actions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              target={action.kind === "whatsapp" ? "_blank" : undefined}
              rel={action.kind === "whatsapp" ? "noopener noreferrer" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition",
                action.kind === "whatsapp"
                  ? "bg-[#1fa855] text-white hover:bg-[#1a9149]"
                  : "border border-brand-200 bg-white text-brand-800 hover:bg-brand-50"
              )}
            >
              {action.kind === "whatsapp" ? (
                <WhatsappIcon className="h-3.5 w-3.5" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
              )}
              {action.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
