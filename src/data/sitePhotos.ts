import type { ImageCredit } from "@/data/imageCredits";

/** A licensed photo the site itself uses (not a car's), with its credit. */
export interface SitePhoto extends ImageCredit {
  alt: string;
  /** Where it appears, for the credits page. */
  usedFor: string;
  /** What was changed, which CC BY-SA asks to say. */
  changes: string;
}

/** The homepage's hall: wide and tall crops in /public/home. */
export const HERO_PHOTO: SitePhoto = {
  alt: "صفوف سيارات داخل قاعة عرض",
  usedFor: "صورة الواجهة في الصفحة الرئيسية",
  author: "Bob Harvey",
  license: "CC BY-SA 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  source: "https://commons.wikimedia.org/wiki/File:Car_Supermarket_-_geograph.org.uk_-_4739965.jpg",
  changes: "قُصّت الصورة وأُضيف لها تظليل داكن",
};

export const SITE_PHOTOS = [HERO_PHOTO];
