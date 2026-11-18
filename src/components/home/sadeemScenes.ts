// The short scenes the home page plays to show what Sadeem does: selling first
// (recommend, compare, book or buy), then answering about the showroom.
// Every car, price, count and detail in them comes from the stock and the
// site's settings, so the picture never shows something the showroom doesn't have.
//
// 15 Nov: the scenes follow the visitor. With nothing known they are picked at
// random each visit (the server renders a fixed set, the browser swaps in a
// random one); once the visitor has told Sadeem what they want, or opened car
// pages, the scenes are about that: their budget and type, cars like the one
// they looked at, and the car they want (lib/interest).
import { site } from "@/config/site";
import type { Interest } from "@/lib/interest";
import { brandNameAr, carCount, carNameAr, formatCarMileage, formatNumber } from "@/lib/format";
import type { Car } from "@/types/car";

/** What a scene needs of a car (sent to the browser, so no long texts). */
export type SceneSource = Pick<
  Car,
  "id" | "brand" | "model" | "brandAr" | "modelAr" | "year" | "price" | "condition" | "seats" | "bodyType" | "fuel" | "mileage" | "city" | "status" | "featured" | "images"
>;

export const toSceneSource = (car: Car): SceneSource => ({
  id: car.id,
  brand: car.brand,
  model: car.model,
  brandAr: car.brandAr,
  modelAr: car.modelAr,
  year: car.year,
  price: car.price,
  condition: car.condition,
  seats: car.seats,
  bodyType: car.bodyType,
  fuel: car.fuel,
  mileage: car.mileage,
  city: car.city,
  status: car.status,
  featured: car.featured,
  images: car.images.slice(0, 1),
});

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
    | { kind: "booking"; purpose: "viewing" | "buy"; phone: string; car: string; city: string }
    | { kind: "hours"; hours: string; afterHours: string; whatsapp: string }
  );

const millions = (iqd: number) => `${formatNumber(Math.round(iqd / 100_000) / 10)} مليون`;

function sceneCar(car: SceneSource): SceneCar {
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

/** «للتيغو», «للاندكروزر» (one lam less before a lam), or «لـ EV6» for a model that keeps its Latin name. */
const forModel = (car: SceneSource) =>
  car.modelAr ? (car.modelAr.startsWith("ل") ? `لل${car.modelAr.slice(1)}` : `لل${car.modelAr}`) : `لـ ${car.model}`;
const andModel = (car: SceneSource) => (car.modelAr ? `وال${car.modelAr}` : `و ${car.model}`);
const theModel = (car: SceneSource) => (car.modelAr ? `ال${car.modelAr}` : car.model);
const sameModel = (a: SceneSource, b: SceneSource) => a.brand === b.brand && a.model === b.model;

/** The lower (or higher) of two numbers wins the row; equal ones leave it plain. */
const better = (a: number, b: number, lowerWins: boolean): 0 | 1 | undefined =>
  a === b ? undefined : (a < b) === lowerWins ? 0 : 1;

const fold = (s: string) => s.trim().toLowerCase().replace(/[أإآ]/g, "ا");
/** «Toyota», «تويوتا» or an alias the search took: the car's own names in either language. */
const namedAs = (names: string[] | undefined, ...own: (string | undefined)[]) =>
  !names?.length || names.some((n) => own.some((o) => o && fold(o) === fold(n)));

/** What the visitor asked for, as a filter over the stock. */
interface Wish {
  budget?: number;
  bodyTypes?: string[];
  brands?: string[];
  models?: string[];
  seats?: number;
  fuels?: string[];
  condition?: string;
}

function matches(car: SceneSource, w: Wish) {
  // SUV covers the big ones filed as «دفع رباعي», as the search does.
  const bodies = w.bodyTypes?.includes("SUV") ? [...w.bodyTypes, "دفع رباعي"] : w.bodyTypes;
  return (
    (!w.budget || car.price <= w.budget) &&
    (!bodies?.length || bodies.includes(car.bodyType)) &&
    namedAs(w.brands, car.brand, car.brandAr) &&
    namedAs(w.models, car.model, car.modelAr) &&
    (!w.seats || car.seats >= w.seats) &&
    (!w.fuels?.length || w.fuels.includes(car.fuel)) &&
    (!w.condition || car.condition === w.condition)
  );
}

/** The wish in the buyer's words: «أريد SUV تويوتا 7 مقاعد زيرو بحدود 60 مليون». */
function askFor(w: Wish, example: SceneSource): string {
  const parts = ["أريد"];
  if (w.models?.length) parts.push(brandNameAr(example), example.modelAr ?? example.model);
  else {
    const body = w.bodyTypes?.[0];
    parts.push(body ? `سيارة ${bodyWord(body)}` : "سيارة");
    if (w.brands?.length) parts.push(brandNameAr(example));
  }
  if (w.seats && w.seats >= 6) parts.push(`${w.seats} مقاعد`);
  if (w.fuels?.length) parts.push(w.fuels[0]);
  if (w.condition) parts.push(w.condition === "جديدة" ? "زيرو" : "مستعملة");
  if (w.budget) parts.push(`بحدود ${millions(w.budget)}`);
  return parts.join(" ");
}

/** A body type as a buyer says it: «بيك أب» for شاحنة. */
const bodyWord = (body: string) => (body === "شاحنة" ? "بيك أب" : body);

/** The «finding cars» scene for `wish` over the cars that match it. */
function findScene(wish: Wish, pool: SceneSource[], does: string): { scene: Scene; shown: SceneSource[] } {
  // With a budget, the ones that use it best come first; without one, the newest.
  const shown = [...pool].sort((a, b) => (wish.budget ? b.price - a.price : b.year - a.year)).slice(0, 3);
  const what = wish.budget ? "ضمن ميزانيتك" : "تناسب طلبك";
  const which = wish.budget ? "الأقرب لميزانيتك" : "أحدثها";
  return {
    shown,
    scene: {
      kind: "cars",
      verb: "يجيبلك",
      ask: askFor(wish, shown[0]),
      does,
      reply: pool.length > 3 ? `عدنا ${carCount(pool.length, "after")} ${what}، وهذي ${which}:` : `عدنا ${carCount(pool.length, "after")} ${what}:`,
      cars: shown.map(sceneCar),
    },
  };
}

/** Ready-made wishes for a visitor we know nothing about; each one only when the stock has cars for it. */
const STARTERS: Wish[] = [
  { seats: 7, budget: 50_000_000 },
  { bodyTypes: ["SUV"], budget: 40_000_000 },
  { bodyTypes: ["SUV"], budget: 70_000_000 },
  { bodyTypes: ["سيدان"], budget: 30_000_000 },
  { condition: "جديدة", budget: 50_000_000 },
  { fuels: ["هايبرد"] },
  { bodyTypes: ["دفع رباعي"] },
];

interface Options {
  interest?: Interest;
  /** Math.random in the browser; without it the choice is fixed (the server's first render). */
  random?: () => number;
}

export function sadeemScenes(cars: SceneSource[], { interest, random }: Options = {}): Scene[] {
  const available = cars.filter((car) => car.status === "متوفرة");
  const byId = new Map(available.map((car) => [car.id, car]));
  const pick = <T,>(list: T[]): T | undefined => (list.length ? list[random ? Math.floor(random() * list.length) : 0] : undefined);
  const scenes: Scene[] = [];

  const told: Wish = {
    budget: interest?.budget,
    bodyTypes: interest?.bodyTypes,
    brands: interest?.brands,
    models: interest?.models,
    seats: interest?.seats,
    fuels: interest?.fuels,
    condition: interest?.condition,
  };
  const toldSomething = Object.values(told).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined));

  // The car they want, else the car page they opened last (still for sale) that
  // fits what they told Sadeem: a Land Cruiser looked at once doesn't lead the
  // scenes of a buyer who then asked for an SUV within 35 million.
  const wanted = interest?.wanted ? byId.get(interest.wanted) : undefined;
  const viewed = (interest?.views ?? []).map((v) => byId.get(v.id)).filter((c): c is SceneSource => !!c);
  const focus = wanted ?? viewed.find((car) => !toldSomething || matches(car, told));

  /** Cars like `car`: same type, the nearest prices first. */
  const like = (car: SceneSource) =>
    available
      .filter((c) => c.id !== car.id && !sameModel(c, car) && c.bodyType === car.bodyType)
      .sort((a, b) => Math.abs(a.price - car.price) - Math.abs(b.price - car.price));

  // 1. Finding cars: what they told Sadeem, else cars like the one they looked at, else a random wish.
  let shown: SceneSource[] = [];
  const toldPool = toldSomething ? available.filter((car) => matches(car, told)) : [];
  if (toldPool.length > 0) {
    const found = findScene(told, toldPool, "يجيبلك اللي طلبته من سيارات المعرض");
    shown = found.shown;
    scenes.push(found.scene);
  } else if (focus && like(focus).length > 0) {
    const similar = like(focus);
    shown = similar.slice(0, 3);
    scenes.push({
      kind: "cars",
      verb: "يجيبلك",
      ask: `عندكم سيارات مثل ${theModel(focus)}؟`,
      does: "يجيبلك سيارات من نفس الفئة وبسعر قريب",
      reply: `عدنا ${carCount(similar.length, "after")} ${bodyWord(focus.bodyType)} غير ${theModel(focus)}، وهذي الأقرب بسعرها:`,
      cars: shown.map(sceneCar),
    });
  } else {
    const usable = STARTERS.map((wish) => ({ wish, pool: available.filter((car) => matches(car, wish)) })).filter((s) => s.pool.length >= 2);
    const starter = pick(usable);
    if (starter) {
      const found = findScene(starter.wish, starter.pool, "يجيبلك من سيارات المعرض على گد طلبك");
      shown = found.shown;
      scenes.push(found.scene);
    }
  }

  // 2. Comparing: their car against the nearest one like it, else two of the cars just shown.
  let pair: [SceneSource, SceneSource] | undefined;
  if (focus && like(focus)[0]) pair = [focus, like(focus)[0]];
  else {
    const first = shown[0];
    const second = shown.find((c) => first && !sameModel(c, first)) ?? (first ? like(first)[0] : undefined);
    if (first && second) pair = [first, second];
  }
  if (!pair) {
    const cheap = [...available].sort((x, y) => x.price - y.price);
    const second = cheap.find((c) => cheap[0] && !sameModel(c, cheap[0]));
    if (cheap[0] && second) pair = [cheap[0], second];
  }
  if (pair) {
    const [a, b] = pair;
    const gap = Math.abs(a.price - b.price);
    scenes.push({
      kind: "compare",
      verb: "يقارنلك",
      ask: `قارنلي بين ${theModel(a)} ${andModel(b)}`,
      does: "يقارنلك بين سيارتين بالأرقام",
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

  // 3. Closing: buying the car they want, else a viewing of the car they looked at or were shown.
  const drive = wanted ?? focus ?? shown[0] ?? pick(available.filter((c) => c.featured)) ?? available[0];
  if (drive) {
    scenes.push(
      wanted
        ? {
            kind: "booking",
            purpose: "buy",
            verb: "يوصّل طلبك",
            ask: `أريد أشتري ${theModel(drive)}`,
            does: "يسجّل طلب الشراء ويوصله للفريق",
            reply: "دزلي رقمك، والفريق يتصل بيك ويتفق وياك على الشراء.",
            phone: "07•• ••• ••••",
            car: `${carNameAr(drive)} ${drive.year}`,
            city: drive.city,
          }
        : {
            kind: "booking",
            purpose: "viewing",
            verb: "يحجزلك",
            ask: `أريد أحجز موعد معاينة ${forModel(drive)}`,
            does: "يسجّل طلب المعاينة ويوصله للفريق",
            reply: "تعاينها وتفحصها بالمعرض. دزلي رقمك، والفريق يتصل بيك ويتفق وياك على الموعد.",
            phone: "07•• ••• ••••",
            car: `${carNameAr(drive)} ${drive.year}`,
            city: drive.city,
          }
    );
  }

  scenes.push({
    kind: "hours",
    verb: "يجاوبك",
    ask: "شوكت دوامكم؟ وشلون أتواصل وياكم؟",
    does: "ويجاوبك عن المعرض: الدوام والتواصل",
    reply: "هذا دوامنا ورقمنا:",
    hours: site.hours,
    afterHours: "وآني أجاوبك بأي وقت، حتى برا الدوام",
    whatsapp: site.whatsapp.replace(/^964(\d{3})(\d{3})(\d{4})$/, "0$1 $2 $3"),
  });

  return scenes;
}
