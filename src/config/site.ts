// Showroom identity and contact details — edit here and every page, button and
// Sadeem's replies pick it up.
export const site = {
  name: "المعرض الذكي",
  tagline: "سيارتك المناسبة لا تدوخ وتدوّر عليها، سديم يجيبها بثقة وأسرع",
  url: "https://maared-al-thaki.duckdns.org",
  phone: "+964 783 854 8091",
  whatsapp: "9647838548091",
  city: "بغداد",
  address: "بغداد، العراق",
  // A Google Maps link to the showroom. Empty: there is no public address, so
  // the site offers to arrange a viewing on WhatsApp instead of directions.
  mapsUrl: "",
  hours: "السبت - الخميس: 9 صباحاً - 7 مساءً",
  // Under the hours: what is there outside them (18 Nov; it said «الدعم الفني
  // متوفر كل يوم», which a car showroom doesn't have and the hours contradict).
  afterHours: "سديم يجاوبك بأي وقت، حتى برا الدوام",
  // Leave empty to hide the icon in the footer.
  social: {
    facebook: "",
    instagram: "",
    youtube: "",
  },
};

export const phoneHref = `tel:${site.phone.replace(/\s/g, "")}`;

export function whatsappHref(message?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
