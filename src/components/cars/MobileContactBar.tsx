import { Phone } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { phoneHref, whatsappHref } from "@/config/site";
import { carWhatsappMessage } from "@/lib/carMessages";
import { formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

/** Price and contact buttons pinned to the bottom of the screen on phones. */
export function MobileContactBar({ car }: { car: Car }) {
  return (
    <div
      data-contact-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-neutral-500">
            <bdi>
              {car.brand} {car.model} {car.year}
            </bdi>
          </p>
          <p className="text-[17px] font-bold leading-6 text-brand-950">
            {formatNumber(car.price)} <span className="text-xs font-semibold text-neutral-500">د.ع</span>
          </p>
        </div>
        <a
          href={phoneHref}
          aria-label="اتصال"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-950 text-white"
        >
          <Phone className="h-5 w-5" />
        </a>
        <a
          href={whatsappHref(carWhatsappMessage(car))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-[#1fa855] px-4 text-sm font-bold text-white"
        >
          <WhatsappIcon className="h-4.5 w-4.5" />
          واتساب
        </a>
      </div>
    </div>
  );
}
