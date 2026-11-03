// The tools Sadeem (the LLM) can call. Each one runs against Supabase and
// returns compact JSON; the model never sees or invents anything else.
import { site } from "@/config/site";
import { USD_TO_IQD } from "@/lib/format";
import { insert, rpc, select, type SupabaseEnv } from "@/server/supabase";
import { type CarRow } from "@/server/catalog";
import { budgetFromWords } from "./verify";

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
] as const;

// ---------------------------------------------------------------------------
// Database rows → app types
// ---------------------------------------------------------------------------

interface SearchRow extends Omit<CarRow, "cylinders" | "featured" | "description" | "images"> {
  total_count: number;
}

// What the model reads about a car: enough to choose and to answer, no noise.
// Arabic names of every car (most buyers read no English), from cars_full,
// fetched again at most once a minute.
const NAMES_TTL_MS = 60_000;
let namesCache: { at: number; names: Map<string, string> } | null = null;

export async function arabicNames(env: SupabaseEnv): Promise<Map<string, string>> {
  if (namesCache && Date.now() - namesCache.at < NAMES_TTL_MS) return namesCache.names;
  const rows = await select<{ id: string; brand: string; brand_ar: string | null; model: string; model_ar: string | null }[]>(
    env,
    "cars_full",
    "select=id,brand,brand_ar,model,model_ar"
  );
  // Models without an Arabic name keep theirs ("لكزس RX 350"): it is a number buyers read as is.
  const names = new Map(rows.map((r) => [r.id, `${r.brand_ar ?? r.brand} ${r.model_ar ?? r.model}`]));
  namesCache = { at: Date.now(), names };
  return names;
}

// budgetMax: the buyer's budget, so a car above it says by how much (the
// reply quotes these figures instead of working them out).
function brief(row: SearchRow | CarRow, arabicName?: string, budgetMax?: number) {
  const overBy = budgetMax && row.price_iqd > budgetMax ? row.price_iqd - budgetMax : 0;
  return {
    id: row.id,
    // What the reply calls the car; name_en and the trim only to tell cars apart.
    name: `${arabicName ?? `${row.brand} ${row.model}`} ${row.year}`,
    name_en: `${row.brand} ${row.model}${row.trim_level ? ` ${row.trim_level}` : ""} ${row.year}`,
    price_iqd: row.price_iqd,
    price_usd: usdOf(row.price_iqd),
    condition: row.condition,
    origin: row.origin,
    body: row.body_type,
    mileage_km: row.mileage_km,
    fuel: row.fuel,
    transmission: row.transmission,
    engine: row.engine,
    hp: row.horsepower,
    drivetrain: row.drivetrain,
    seats: row.seats,
    color: row.color,
    city: row.city,
    status: row.status,
    tags: row.tags,
    ...(overBy ? { over_budget_by_iqd: overBy, over_budget_by_usd: usdOf(overBy) } : {}),
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

export function fetchCars(env: SupabaseEnv, carIds: string[]): Promise<CarRow[]> {
  if (carIds.length === 0) return Promise.resolve([]);
  return select<CarRow[]>(env, "cars_full", `id=in.(${carIds.join(",")})&select=*`);
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
  /** Every car id a tool returned this turn (and shown before), so only real cars are shown. */
  seenIds: Set<string>;
  /** Prices of those cars, to check every figure the reply quotes. */
  seenPrices: Map<string, number>;
  request?: BuyerRequest;
  overBudget: OverBudget[];
  /** Matches of the last search (often more than the cars shown). */
  matchCount?: number;
  shownIds: string[];
  /** Cars looked up with get_car_details, shown when the reply names none of the cars. */
  detailIds: string[];
  /** Cars the tools returned this turn, to spot the ones the reply names. */
  found: Map<string, { model: string; name: string; year: number }>;
  leadSaved: boolean;
  searches: Record<string, unknown>[];
}

// Models sometimes put a wider search range in budget_max_iqd ("ب عشرين
// مليون" recorded as 40,000,000), which hides over-budget cars from the check.
// The buyer's own words win when they name exactly one ceiling amount.
function checkBudget(request: BuyerRequest, words: string): { from: number; to: number } | null {
  const amount = budgetFromWords(words);
  if (!amount || !request.budgetMax || /فوق|أكثر|اكثر|بين/.test(words)) return null;
  const to = Math.round(/حدود|بحد|حوالي|تقريب/.test(words) ? amount * 1.05 : amount);
  if (request.budgetMax >= amount * 0.95 && request.budgetMax <= amount * 1.1) return null;
  const from = request.budgetMax;
  request.budgetMax = to;
  return { from, to };
}

/** Records the cars shown and which of them cost more than the budget. */
export function markShown(state: TurnState, shownIds: string[]) {
  state.shownIds = shownIds;
  // The budget is a ceiling: anything above it must be said out loud.
  const ceiling = state.request?.budgetMax;
  state.overBudget = ceiling
    ? shownIds
        .map((id) => ({ id, price: state.seenPrices.get(id) ?? 0 }))
        .filter((car) => car.price > ceiling)
        .map((car) => ({ ...car, overBy: car.price - ceiling }))
    : [];
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
      const corrected = checkBudget(state.request, typeof args.budget_words === "string" ? args.budget_words : "");
      if (corrected) state.searches.push({ budget_corrected: corrected });
      const { budgetMax } = state.request;
      return budgetMax
        ? {
            ok: true,
            budget_max_iqd: budgetMax,
            budget_max_usd: usdOf(budgetMax),
            ...(corrected
              ? { corrected: `budget_max_iqd ${corrected.from.toLocaleString("en-US")} did not match "${args.budget_words}"; the budget is ${budgetMax.toLocaleString("en-US")}.` }
              : {}),
            next: "Search with max_price = budget_max_iqd. This is the buyer's budget, not a search range: only relax it as Step 5 says.",
          }
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
      const [rows, names] = await Promise.all([rpc<SearchRow[]>(env, "search_cars", params), arabicNames(env)]);
      rows.forEach((row) => {
        state.seenIds.add(row.id);
        state.seenPrices.set(row.id, row.price_iqd);
        state.found.set(row.id, { model: row.model, name: names.get(row.id) ?? row.model, year: row.year });
      });
      state.matchCount = rows[0]?.total_count ?? 0;
      return { total: state.matchCount, cars: rows.map((row) => brief(row, names.get(row.id), state.request?.budgetMax)) };
    }

    case "get_car_details": {
      const [rows, names] = await Promise.all([fetchCars(env, ids(args.ids, 5)), arabicNames(env)]);
      rows.forEach((row) => {
        state.seenIds.add(row.id);
        state.seenPrices.set(row.id, row.price_iqd);
        state.found.set(row.id, { model: row.model, name: names.get(row.id) ?? row.model, year: row.year });
        if (!state.detailIds.includes(row.id)) state.detailIds.push(row.id);
      });
      state.searches.push({ details: rows.map((row) => row.id) });
      return rows.map((row) => ({
        ...brief(row, names.get(row.id), state.request?.budgetMax),
        cylinders: row.cylinders,
        features: row.features,
        description: row.description,
      }));
    }

    case "save_lead": {
      const phone = String(args.phone ?? "").replace(/[^\d+]/g, "");
      // An Iraqi mobile: 07XXXXXXXXX, or +9647XXXXXXXXX.
      const local = phone.replace(/^\+?964/, "0");
      if (!/^07\d{9}$/.test(local)) {
        return { saved: false, error: "Not a full Iraqi mobile number (11 digits starting 07). Ask for it again." };
      }
      if (local === site.whatsapp.replace(/^964/, "0")) {
        return { saved: false, error: "That is the showroom's own number, not the buyer's. Ask for the buyer's number." };
      }
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

    default:
      return { error: `Unknown tool ${name}` };
  }
}
