// The short scenes the home page plays to show what Sadeem does: selling first
// (recommend, compare, book a test drive), then answering about the showroom.
// Every car, price and detail in them comes from the stock and the site's
// settings, so the picture never shows something the showroom doesn't have.
import { site } from "@/config/site";
import type { Catalog } from "@/data/cars";
import { carCount, carNameAr, formatCarMileage, formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

const BUDGET = 50_000_000;

export interface SceneCar {
  id: string;
  name: string;
  /** The model alone («تيغو»), where the full name has no room. */
  model: string;
  year: number;
  price: string;
  image?: string;
  note: string;
}

interface SceneBase {
  /** The scene in one verb, for the picture's own chapter marks. */
  verb: string;
  /** What the buyer asks; the button under the picture sends exactly this to Sadeem. */
  ask: string;
  /** What this scene shows Sadeem doing, under the question. */
  does: string;
  /** Sadeem's line before what he shows. */
  reply: string;
}

export type Scene = SceneBase &
  (
    | { kind: "cars"; cars: SceneCar[] }
    | { kind: "compare"; cars: [SceneCar, SceneCar]; rows: { label: string; values: [string, string]; better?: 0 | 1 }[] }
    | { kind: "booking"; phone: string; car: string; city: string }
    | { kind: "hours"; hours: string; support: string; whatsapp: string }
  );

const millions = (iqd: number) => `${formatNumber(Math.round(iqd / 100_000) / 10)} مليون`;

function sceneCar(car: Car): SceneCar {
  return {
    id: car.id,
    name: carNameAr(car),
    model: car.modelAr ?? car.model,
    year: car.year,
    price: millions(car.price),
    image: car.images[0],
    note: `${car.year}، ${car.condition === "جديدة" ? "زيرو" : "مستعملة"}، ${car.seats} مقاعد`,
  };
}

/** «للتيغو», or «لـ EV6» for a model that keeps its Latin name. */
const forModel = (car: Car) => (car.modelAr ? `لل${car.modelAr}` : `لـ ${car.model}`);
const andModel = (car: Car) => (car.modelAr ? `وال${car.modelAr}` : `و ${car.model}`);
const theModel = (car: Car) => (car.modelAr ? `ال${car.modelAr}` : car.model);

/** The lower (or higher) of two numbers wins the row; equal ones leave it plain. */
const better = (a: number, b: number, lowerWins: boolean): 0 | 1 | undefined =>
  a === b ? undefined : (a < b) === lowerWins ? 0 : 1;

export function sadeemScenes({ getAllCars, getFeaturedCars }: Catalog): Scene[] {
  const available = getAllCars().filter((car) => car.status === "متوفرة");
  // A «بحدود» budget: the cars that use it best come first.
  const family = available.filter((car) => car.seats >= 7 && car.price <= BUDGET).sort((a, b) => b.price - a.price);
  const scenes: Scene[] = [];

  if (family.length > 0) {
    scenes.push({
      kind: "cars",
      verb: "يرشّح",
      ask: "أريد سيارة عائلية 7 مقاعد بحدود 50 مليون",
      does: "يرشّح لك من سيارات المعرض حسب ميزانيتك",
      reply:
        family.length > 3
          ? `عدنا ${carCount(family.length)} 7 مقاعد ضمن 50 مليون، وهذي الأقرب لميزانيتك:`
          : `عدنا ${carCount(family.length)} 7 مقاعد ضمن 50 مليون:`,
      cars: family.slice(0, 3).map(sceneCar),
    });
  }

  const [a, b] = family.length >= 2 ? family : [...available].sort((x, y) => x.price - y.price);
  if (a && b) {
    const gap = Math.abs(a.price - b.price);
    scenes.push({
      kind: "compare",
      verb: "يقارن",
      ask: `قارنلي بين ${theModel(a)} ${andModel(b)}`,
      does: "يقارن بين سيارتين بالأرقام",
      reply: gap > 0 ? `الفرق بيناتهن بالسعر ${millions(gap)} دينار. وهذي المقارنة:` : "سعرهن واحد. وهذي المقارنة:",
      cars: [sceneCar(a), sceneCar(b)],
      rows: [
        { label: "السعر", values: [millions(a.price), millions(b.price)], better: better(a.price, b.price, true) },
        { label: "السنة", values: [String(a.year), String(b.year)], better: better(a.year, b.year, false) },
        { label: "الممشى", values: [formatCarMileage(a.mileage), formatCarMileage(b.mileage)], better: better(a.mileage, b.mileage, true) },
        { label: "المقاعد", values: [String(a.seats), String(b.seats)] },
      ],
    });
  }

  const drive = a ?? getFeaturedCars(1)[0] ?? available[0];
  if (drive) {
    scenes.push({
      kind: "booking",
      verb: "يحجز",
      ask: `أريد أحجز تجربة قيادة ${forModel(drive)}`,
      does: "يسجّل طلب تجربة القيادة ويوصله لفريق المبيعات",
      reply: "دزلي رقمك، والفريق يتصل بيك ويتفق وياك على الوقت.",
      phone: "07•• ••• ••••",
      car: `${carNameAr(drive)} ${drive.year}`,
      city: drive.city,
    });
  }

  scenes.push({
    kind: "hours",
    verb: "يجاوب",
    ask: "شوكت دوامكم؟ وشلون أتواصل وياكم؟",
    does: "ويجيب عن أسئلة المعرض: الدوام والتواصل",
    reply: "هذا دوامنا ورقمنا:",
    hours: site.hours,
    support: site.support,
    whatsapp: site.whatsapp.replace(/^964(\d{3})(\d{3})(\d{4})$/, "0$1 $2 $3"),
  });

  return scenes;
}
