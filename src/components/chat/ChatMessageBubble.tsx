import { CheckCheck, Phone } from "lucide-react";
import { SadeemMascot } from "@/components/ui/SadeemMascot";
import { CarDetailChatCard, CarRecommendationCard } from "./CarRecommendationCard";
import { RichText } from "./RichText";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/cn";
import { MAX_CHAT_CARS, type ChatMessage } from "@/services/ai";
import { splitAtCars } from "@/services/ai/carMarkers";
import type { Car } from "@/types/car";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "numeric", minute: "2-digit" });
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  // Each reply carries the cars as the database had them when it was written.
  const cars = (message.cars ?? []).slice(0, MAX_CHAT_CARS);
  // The reply's paragraphs with each car's card right under the paragraph
  // about it; cards without a place in the text come after the reply.
  const parts = splitAtCars(message.content);
  const placed = new Set(parts.flatMap((part) => ("carId" in part ? [part.carId] : [])));
  const rest = cars.filter((car) => !placed.has(car.id));
  const lastText = parts.findLastIndex((part) => "text" in part);
  const card = (car: Car) =>
    cars.length === 1 ? <CarDetailChatCard car={car} /> : <CarRecommendationCard car={car} />;
  // The cards arrive one after another, after the reply's first lines.
  const order = [...placed, ...rest.map((car) => car.id)];
  const arrive = (carId: string) => ({ animationDelay: `${120 + order.indexOf(carId) * 70}ms` });

  if (isUser) {
    return (
      <div className="flex justify-start animate-msg-mine">
        <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-brand-900 px-3.5 pb-1.5 pt-2.5 text-white shadow-sm">
          <p className="whitespace-pre-line text-[15px] font-normal leading-7">{message.content}</p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-white/60">
            {formatTime(message.timestamp)}
            <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="تمت القراءة" />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse items-start gap-2 animate-msg-in">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/[0.06]">
        <SadeemMascot className="h-6 w-6" />
      </span>

      <div className="flex min-w-0 max-w-[88%] flex-1 flex-col items-end gap-2">
        {parts.map((part, i) => {
          if ("carId" in part) {
            const car = cars.find((c) => c.id === part.carId);
            return car ? (
              <div key={`car-${car.id}`} className="w-full animate-msg-in" style={arrive(car.id)}>
                {card(car)}
              </div>
            ) : null;
          }
          return (
            <div
              key={`text-${i}`}
              className={cn(
                "w-full rounded-2xl border border-black/[0.04] bg-white px-3.5 pb-1.5 pt-2.5 shadow-sm",
                i === 0 && "rounded-tl-md"
              )}
            >
              <div className="text-[15px] font-normal leading-7 text-neutral-800">
                <RichText text={part.text.trim()} />
              </div>

              {i === lastText && message.criteria && message.criteria.length > 0 && (
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

              {i === lastText && <p className="mt-0.5 text-end text-[10.5px] text-neutral-400">{formatTime(message.timestamp)}</p>}
            </div>
          );
        })}

        {rest.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {rest.map((car) => (
              <div key={car.id} className="w-full animate-msg-in" style={arrive(car.id)}>
                {card(car)}
              </div>
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
