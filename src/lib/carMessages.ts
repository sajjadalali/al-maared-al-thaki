import { site } from "@/config/site";
import { carNameAr, formatIQD } from "@/lib/format";
import type { Car } from "@/types/car";

/** The prefilled WhatsApp text for a car: name, price and its page link. */
export function carWhatsappMessage(car: Car): string {
  return `مرحباً، أنا مهتم بسيارة ${carNameAr(car)} ${car.year} بسعر ${formatIQD(car.price)}.\n${site.url}/cars/${car.id}`;
}
