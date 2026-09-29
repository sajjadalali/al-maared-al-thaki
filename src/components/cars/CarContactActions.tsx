"use client";

import { Phone, MessageCircle, CalendarClock } from "lucide-react";
import { askSadeem } from "@/lib/chatBus";
import { formatIQD } from "@/lib/format";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { site, phoneHref, whatsappHref } from "@/config/site";
import type { Car } from "@/types/car";

export function CarContactActions({ car }: { car: Car }) {
  const carLabel = `${car.brand} ${car.model} ${car.year}`;
  const whatsappMessage = `مرحباً، أنا مهتم بسيارة ${carLabel} بسعر ${formatIQD(car.price)}.\n${site.url}/cars/${car.id}`;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={phoneHref}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
        >
          <Phone className="h-4 w-4" />
          اتصال
        </a>
        <a
          href={whatsappHref(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1fa855] py-3 text-sm font-bold text-white transition hover:bg-[#1a9149]"
        >
          <WhatsappIcon className="h-4 w-4" />
          واتساب
        </a>
      </div>
      <button
        type="button"
        onClick={() => askSadeem(`أريد معرفة المزيد عن ${carLabel}`)}
        className="flex items-center justify-center gap-2 rounded-xl border border-brand-900 py-3 text-sm font-bold text-brand-900 transition hover:bg-surface"
      >
        <MessageCircle className="h-4 w-4" />
        اسأل سديم عن هذه السيارة
      </button>
      <button
        type="button"
        onClick={() => askSadeem(`أريد حجز تجربة قيادة لسيارة ${carLabel}`)}
        className="flex items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-sm font-bold text-neutral-600 transition hover:bg-surface"
      >
        <CalendarClock className="h-4 w-4" />
        حجز تجربة قيادة
      </button>
    </div>
  );
}
