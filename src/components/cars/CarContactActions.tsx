"use client";

import { Phone, MessageCircle, CalendarClock } from "lucide-react";
import { askSadeem } from "@/lib/chatBus";
import type { Car } from "@/types/car";

export function CarContactActions({ car }: { car: Car }) {
  const carLabel = `${car.brand} ${car.model} ${car.year}`;

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
      <a
        href="tel:+9647701234567"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
      >
        <Phone className="h-4 w-4" />
        تواصل مع مندوب المبيعات
      </a>
      <button
        type="button"
        onClick={() => askSadeem(`أريد معرفة المزيد عن ${carLabel}`)}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-900 py-3 text-sm font-bold text-brand-900 transition hover:bg-surface"
      >
        <MessageCircle className="h-4 w-4" />
        اسأل سديم عن هذه السيارة
      </button>
      <button
        type="button"
        onClick={() => askSadeem(`أريد حجز تجربة قيادة لسيارة ${carLabel}`)}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-sm font-bold text-neutral-600 transition hover:bg-surface"
      >
        <CalendarClock className="h-4 w-4" />
        حجز تجربة قيادة
      </button>
    </div>
  );
}
