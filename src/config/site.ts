// Showroom identity and contact details — edit here and every page, button and
// Sadeem's replies pick it up.
export const site = {
  name: "المعرض الذكي",
  tagline: "سيارتك بثقة وسرعة",
  url: "https://maared-al-thaki.duckdns.org",
  phone: "+964 770 123 4567",
  whatsapp: "9647701234567",
  email: "info@maared-al-thaki.iq",
  address: "بغداد، شارع فلسطين، العراق",
  hours: "السبت - الخميس: 9 صباحاً - 7 مساءً",
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
