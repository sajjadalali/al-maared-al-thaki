import { Bot } from "lucide-react";
import { CarRecommendationCard } from "./CarRecommendationCard";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/services/ai";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div className={cn("flex max-w-[85%] items-end gap-2", isUser && "flex-row-reverse")}>
        {!isUser && (
          <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
            <Bot className="h-3.5 w-3.5" />
          </span>
        )}
        <div
          className={cn(
            "animate-fade-in rounded-2xl px-3.5 py-2.5 text-sm leading-7",
            isUser
              ? "rounded-tl-sm bg-brand-900 text-white"
              : "rounded-tr-sm border border-black/5 bg-surface text-brand-950"
          )}
        >
          {message.content}
        </div>
      </div>
      <span className={cn("px-1 text-[10px] text-neutral-400", isUser ? "me-9" : "ms-9")}>
        {formatTime(message.timestamp)}
      </span>

      {message.cars && message.cars.length > 0 && (
        <div className="no-scrollbar ms-9 flex max-w-[92%] gap-2.5 overflow-x-auto pb-1 pt-0.5">
          {message.cars.map((car) => (
            <CarRecommendationCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
