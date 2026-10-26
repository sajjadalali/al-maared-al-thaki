// The tools Sadeem (the LLM) can call. Each one runs against Supabase and
// returns compact JSON; the model never sees or invents anything else.
import { USD_TO_IQD } from "@/lib/format";
import { insert, rpc, select, type SupabaseEnv } from "@/server/supabase";
import type { Car } from "@/types/car";

export const MAX_SHOWN_CARS = 3;

const BODY_TYPES = ["سيدان", "SUV", "هاتشباك", "دفع رباعي", "شاحنة", "كوبيه"];
const ORIGINS = ["وكالة", "خليجي", "أمريكي", "كوري", "كندي", "أوروبي", "صيني"];
const FUELS = ["بنزين", "ديزل", "هايبرد", "كهربائي"];
const DRIVETRAINS = ["أمامي", "خلفي", "رباعي", "كلي"];

const list = (items: object, description: string) => ({ type: "array", items, description });
const str = { type: "string" };

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "record_request",
      description:
        "Step 1 of every buyer message about cars: write down what the buyer wants, before searching. The server checks the cars you show against this budget.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["search", "details", "compare", "contact", "other"],
            description: "search = find cars; details/compare = about cars already shown; contact = visit, test drive, call.",
          },
          budget_max_iqd: {
            type: "integer",
            description: "Price ceiling in dinars after conversion (بحدود X → X × 1.05; تحت X → X). Omit if no budget.",
          },
          budget_min_iqd: { type: "integer", description: "Price floor in dinars, if they gave one." },
          budget_words: { type: "string", description: "The budget exactly as the buyer wrote it, e.g. \"3 دفاتر\"." },
          currency: { type: "string", enum: ["IQD", "USD"], description: "The currency the buyer talks in." },
          must_have: list(str, "Hard requirements in short Arabic, e.g. [\"7 مقاعد\", \"خليجي\"]."),
          nice_to_have: list(str, "Preferences that may be dropped."),
          carried_over: list(str, "Requirements kept from earlier messages because the buyer is refining the same search."),
        },
        required: ["intent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_cars",
      description:
        "Search the showroom's stock. Use structured filters for everything the buyer stated; put only leftover words in `text`. Returns at most `limit` cars plus `total` matches. Call again with relaxed filters when nothing matches.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Leftover free text (any language), e.g. a feature or a word you could not map." },
          brands: list(str, "Makes, e.g. [\"Toyota\"]; Arabic names and aliases also work (\"بنز\")."),
          models: list(str, "Models, e.g. [\"Land Cruiser\"] or [\"لاندكروزر\"]. Prado is a separate model."),
          body_types: list({ type: "string", enum: BODY_TYPES }, "شاحنة = pickup (بيك أب)."),
          condition: { type: "string", enum: ["جديدة", "مستعملة"], description: "جديدة = new, zero km (زيرو)." },
          origins: list({ type: "string", enum: ORIGINS }, "Import market (وارد خليجي/أمريكي...) or وكالة (Iraqi dealer)."),
          fuels: list({ type: "string", enum: FUELS }, "Fuel type."),
          transmission: { type: "string", enum: ["أوتوماتيك", "يدوي"] },
          drivetrains: list({ type: "string", enum: DRIVETRAINS }, "4x4/دفع رباعي = [\"رباعي\", \"كلي\"]."),
          cities: list(str, "Governorates where the car is, in Arabic (\"بغداد\")."),
          min_price: { type: "integer", description: "Minimum price in Iraqi dinars." },
          max_price: { type: "integer", description: "Maximum price in Iraqi dinars." },
          min_year: { type: "integer" },
          max_year: { type: "integer" },
          min_seats: { type: "integer", description: "e.g. 7 for a family car with 7 seats." },
          max_mileage_km: { type: "integer" },
          features: list(str, "Equipment that must be present, in Arabic, e.g. [\"فتحة سقف\", \"كاميرا 360\"]."),
          tags: list(str, "Catalog tags: فاخرة (luxury), اقتصادية (economical)."),
          chinese: { type: "boolean", description: "true for Chinese makes (صينية)." },
          include_unavailable: { type: "boolean", description: "Also return reserved/sold cars. Default false." },
          exclude_ids: list(str, "Car ids already shown, to get other options."),
          sort: {
            type: "string",
            enum: ["relevance", "price_asc", "price_desc", "year_desc", "mileage_asc"],
            description: "price_asc for cheapest, price_desc to use the budget fully.",
          },
          limit: { type: "integer", description: "1-10, default 6." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_car_details",
      description: "Full details of specific cars (equipment list, description, engine, photos count). Use for questions about a car or comparisons.",
      parameters: {
        type: "object",
        properties: { ids: list(str, "Car ids such as \"car-003\", at most 5.") },
        required: ["ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_cars",
      description: `Show cars to the buyer as cards (photo, price, link) under your reply, best first, at most ${MAX_SHOWN_CARS}. Only ids returned by search_cars or get_car_details.`,
      parameters: {
        type: "object",
        properties: { ids: list(str, "Car ids in display order.") },
        required: ["ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_lead",
      description: "Save the buyer's phone number so the sales team calls back. Only when the buyer gives a number and wants a call, a test drive or an offer.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string" },
          name: { type: "string" },
          car_id: { type: "string" },
          note: { type: "string", description: "What they want, in Arabic (e.g. تجربة قيادة يوم السبت)." },
        },
        required: ["phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_replies",
      description: "2-3 short follow-up messages the buyer can tap, written as the buyer would say them in Iraqi Arabic.",
      parameters: {
        type: "object",
        properties: { options: list(str, "2-3 short options.") },
        required: ["options"],
      },
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Database rows → app types
// ---------------------------------------------------------------------------

interface SearchRow {
  id: string;
  brand: string;
  model: string;
  trim_level: string | null;
  year: number;
  price_iqd: number;
  condition: string;
  origin: string | null;
  body_type: string;
  mileage_km: number;
  fuel: string;
  transmission: string;
  drivetrain: string | null;
  seats: number;
  horsepower: number | null;
  engine: string;
  color: string;
  city: string;
  status: string;
  tags: string[];
  features: string[];
  total_count: number;
}

interface FullRow extends Omit<SearchRow, "total_count"> {
  cylinders: number | null;
  featured: boolean;
  description: string;
  images: { path: string }[];
}

export function toCar(row: FullRow): Car {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    trim: row.trim_level ?? undefined,
    year: row.year,
    price: row.price_iqd,
    currency: "IQD",
    condition: row.condition as Car["condition"],
    origin: (row.origin ?? undefined) as Car["origin"],
    bodyType: row.body_type as Car["bodyType"],
    mileage: row.mileage_km,
    transmission: row.transmission as Car["transmission"],
    fuel: row.fuel as Car["fuel"],
    engine: row.engine,
    cylinders: row.cylinders ?? undefined,
    horsepower: row.horsepower ?? undefined,
    drivetrain: (row.drivetrain ?? undefined) as Car["drivetrain"],
    seats: row.seats,
    color: row.color,
    city: row.city,
    status: row.status as Car["status"],
    featured: row.featured,
    tags: row.tags,
    description: row.description,
    images: row.images.map((image) => image.path),
    features: row.features,
  };
}

// What the model reads about a car: enough to choose and to answer, no noise.
function brief(row: SearchRow | FullRow) {
  return {
    id: row.id,
    name: `${row.brand} ${row.model}${row.trim_level ? ` ${row.trim_level}` : ""} ${row.year}`,
    price_iqd: row.price_iqd,
    price_usd: usdOf(row.price_iqd),
    condition: row.condition,
    origin: row.origin,
    body: row.body_type,
    mileage_km: row.mileage_km,
    fuel: row.fuel,
    engine: row.engine,
    hp: row.horsepower,
    drivetrain: row.drivetrain,
    seats: row.seats,
    color: row.color,
    city: row.city,
    status: row.status,
    tags: row.tags,
  };
}

/** Dinars to the dollar figure quoted to buyers, rounded to the nearest 100. */
export const usdOf = (iqd: number) => Math.round(iqd / USD_TO_IQD / 100) * 100;

const positiveInt = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;

const ids = (value: unknown, max: number) =>
  (Array.isArray(value) ? value : [])
    .filter((id): id is string => typeof id === "string" && /^[\w-]{1,40}$/.test(id))
    .slice(0, max);

export function fetchCars(env: SupabaseEnv, carIds: string[]): Promise<FullRow[]> {
  if (carIds.length === 0) return Promise.resolve([]);
  return select<FullRow[]>(env, "cars_full", `id=in.(${carIds.join(",")})&select=*`);
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/** State one reply builds up while the model calls tools. */
export interface BuyerRequest {
  intent: string;
  budgetMax?: number;
  budgetMin?: number;
  currency?: "IQD" | "USD";
}

export interface OverBudget {
  id: string;
  price: number;
  overBy: number;
}

export interface TurnState {
  /** Every car id a tool returned this turn, so show_cars can't show made-up ids. */
  seenIds: Set<string>;
  /** Prices of those cars, to check every figure the reply quotes. */
  seenPrices: Map<string, number>;
  request?: BuyerRequest;
  overBudget: OverBudget[];
  /** Matches of the last search (often more than the cars shown). */
  matchCount?: number;
  shownIds: string[];
  quickReplies: string[];
  leadSaved: boolean;
  searches: Record<string, unknown>[];
}

const SEARCH_PARAMS: Record<string, string> = {
  text: "p_text",
  brands: "p_brands",
  models: "p_models",
  body_types: "p_body_types",
  condition: "p_condition",
  origins: "p_origins",
  fuels: "p_fuels",
  transmission: "p_transmission",
  drivetrains: "p_drivetrains",
  cities: "p_cities",
  min_price: "p_min_price",
  max_price: "p_max_price",
  min_year: "p_min_year",
  max_year: "p_max_year",
  min_seats: "p_min_seats",
  max_mileage_km: "p_max_mileage",
  features: "p_features",
  tags: "p_tags",
  chinese: "p_chinese",
  include_unavailable: "p_include_unavailable",
  exclude_ids: "p_exclude_ids",
  sort: "p_sort",
  limit: "p_limit",
};

export async function runTool(
  env: SupabaseEnv,
  name: string,
  args: Record<string, unknown>,
  state: TurnState
): Promise<unknown> {
  switch (name) {
    case "record_request": {
      state.request = {
        intent: typeof args.intent === "string" ? args.intent : "other",
        budgetMax: positiveInt(args.budget_max_iqd),
        budgetMin: positiveInt(args.budget_min_iqd),
        currency: args.currency === "USD" ? "USD" : args.currency === "IQD" ? "IQD" : undefined,
      };
      state.searches.push({ request: args });
      const { budgetMax } = state.request;
      return budgetMax
        ? { ok: true, budget_max_iqd: budgetMax, budget_max_usd: usdOf(budgetMax), next: "Search with max_price = budget_max_iqd." }
        : { ok: true };
    }

    case "search_cars": {
      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        const param = SEARCH_PARAMS[key];
        const empty = value === null || value === "" || (Array.isArray(value) && value.length === 0);
        if (param && !empty) params[param] = value;
      }
      params.p_limit = Math.min(Math.max(Number(params.p_limit) || 6, 1), 10);
      state.searches.push(args);
      const rows = await rpc<SearchRow[]>(env, "search_cars", params);
      rows.forEach((row) => {
        state.seenIds.add(row.id);
        state.seenPrices.set(row.id, row.price_iqd);
      });
      state.matchCount = rows[0]?.total_count ?? 0;
      return { total: state.matchCount, cars: rows.map(brief) };
    }

    case "get_car_details": {
      const rows = await fetchCars(env, ids(args.ids, 5));
      rows.forEach((row) => {
        state.seenIds.add(row.id);
        state.seenPrices.set(row.id, row.price_iqd);
      });
      return rows.map((row) => ({ ...brief(row), cylinders: row.cylinders, features: row.features, description: row.description }));
    }

    case "show_cars": {
      const wanted = ids(args.ids, MAX_SHOWN_CARS);
      const unknown = wanted.filter((id) => !state.seenIds.has(id));
      state.shownIds = wanted.filter((id) => state.seenIds.has(id));
      // The budget is a ceiling: anything above it must be said out loud.
      const ceiling = state.request?.budgetMax;
      state.overBudget = ceiling
        ? state.shownIds
            .map((id) => ({ id, price: state.seenPrices.get(id) ?? 0 }))
            .filter((car) => car.price > ceiling)
            .map((car) => ({ ...car, overBy: car.price - ceiling }))
        : [];
      return {
        shown: state.shownIds,
        ...(unknown.length ? { error: `Not from a search this turn, not shown: ${unknown.join(", ")}` } : {}),
        ...(state.overBudget.length
          ? {
              over_budget: state.overBudget.map((car) => ({
                id: car.id,
                over_by_iqd: car.overBy,
                over_by_usd: usdOf(car.overBy),
              })),
              rule: "Your reply must say these cars are above the buyer's budget and by how much.",
            }
          : {}),
      };
    }

    case "save_lead": {
      const phone = String(args.phone ?? "").replace(/[^\d+]/g, "");
      if (phone.replace(/\D/g, "").length < 8) return { saved: false, error: "Invalid phone number; ask again." };
      const carId = typeof args.car_id === "string" && state.seenIds.has(args.car_id) ? args.car_id : null;
      const saved = await insert(env, "leads", {
        phone,
        name: typeof args.name === "string" ? args.name.slice(0, 80) : null,
        car_id: carId,
        message: typeof args.note === "string" ? args.note.slice(0, 500) : null,
        source: "chat",
      });
      state.leadSaved = saved;
      return saved ? { saved: true } : { saved: false, error: "Saving is not available; give the WhatsApp number instead." };
    }

    case "suggest_replies": {
      state.quickReplies = (Array.isArray(args.options) ? args.options : [])
        .filter((o): o is string => typeof o === "string" && o.length <= 60)
        .slice(0, 3);
      return { ok: true };
    }

    default:
      return { error: `Unknown tool ${name}` };
  }
}
