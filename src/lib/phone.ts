import { site } from "@/config/site";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * An Iraqi mobile number as 07XXXXXXXXX, from what a person typed (Arabic or
 * Persian digits, spaces, dashes, +964 or 00964); null when it isn't one.
 * Sadeem's save_lead and the contact form both go through it.
 */
export function iraqiMobile(input: string): string | null {
  const digits = input
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[^\d+]/g, "");
  const local = digits.replace(/^00964/, "0").replace(/^\+?964/, "0");
  return /^07\d{9}$/.test(local) ? local : null;
}

/** The showroom's own number, which a buyer sometimes types back. */
export const isShowroomNumber = (phone: string) => phone === site.whatsapp.replace(/^964/, "0");
