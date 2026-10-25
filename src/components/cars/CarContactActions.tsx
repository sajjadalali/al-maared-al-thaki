"use client";

import { Phone, CalendarClock, Sparkles } from "lucide-react";
import { askSadeem } from "@/lib/chatBus";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { phoneHref, whatsappHref } from "@/config/site";
import { carWhatsappMessage } from "@/lib/carMessages";
import type { Car } from "@/types/car";

export function CarContactActions({ car }: { car: Car }) {
  const carLabel = `${car.brand} ${car.model} ${car.year}`;

  return (
    <div className="flex flex-col gap-2.5">
      <a
        href={whatsappHref(carWhatsappMessage(car))}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-2xl bg-[#1fa855] py-3.5 text-[15px] font-bold text-white transition hover:bg-[#1a9149]"
      >
        <WhatsappIcon className="h-5 w-5" />
        استفسر على واتساب
      </a>
      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={phoneHref}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-950 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
        >
          <Phone className="h-4 w-4" />
          اتصال
        </a>
        <button
          type="button"
          onClick={() => askSadeem(`أريد معرفة المزيد عن ${carLabel}`)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 py-3 text-sm font-bold text-brand-950 transition hover:bg-surface"
        >
          <Sparkles className="h-4 w-4 text-accent-500" />
          اسأل سديم
        </button>
      </div>
      <button
        type="button"
        onClick={() => askSadeem(`أريد حجز تجربة قيادة لسيارة ${carLabel}`)}
        className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-neutral-600 transition hover:bg-surface hover:text-brand-950"
      >
        <CalendarClock className="h-4 w-4" />
        احجز تجربة قيادة
      </button>
    </div>
  );
}
