import { site } from "@/config/site";
import { formatIQD } from "@/lib/format";
import type { Car } from "@/types/car";

/** The prefilled WhatsApp text for a car: name, price and its page link. */
export function carWhatsappMessage(car: Car): string {
  return `مرحباً، أنا مهتم بسيارة ${car.brand} ${car.model} ${car.year} بسعر ${formatIQD(car.price)}.\n${site.url}/cars/${car.id}`;
}
