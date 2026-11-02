// Showroom identity and contact details — edit here and every page, button and
// Sadeem's replies pick it up.
export const site = {
  name: "المعرض الذكي",
  tagline: "سيارتك المناسبة لا تدوخ وتدوّر عليها، سديم يجيبها بثقة وأسرع",
  url: "https://maared-al-thaki.duckdns.org",
  phone: "+964 783 854 8091",
  whatsapp: "9647838548091",
  email: "hi@sajjadalali.com",
  city: "بغداد",
  address: "بغداد، العراق",
  // A Google Maps link to the showroom. Empty: there is no public address, so
  // the site offers to arrange a viewing on WhatsApp instead of directions.
  mapsUrl: "",
  hours: "السبت - الخميس: 9 صباحاً - 7 مساءً",
  support: "الدعم الفني متوفر كل يوم",
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
