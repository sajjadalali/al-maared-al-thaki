// Server-side Supabase access over its REST API (PostgREST). Import only from
// route handlers and server code: it reads secret keys from the environment.

export interface SupabaseEnv {
  url: string;
  /** Publishable (or legacy anon) key: reads the public catalog. */
  readKey: string;
  /** Secret (or legacy service_role) key: writes leads and chat logs. */
  writeKey?: string;
}

export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const writeKey = process.env.SUPABASE_SECRET_KEY || undefined;
  const readKey = process.env.SUPABASE_PUBLISHABLE_KEY || writeKey;
  return url && readKey ? { url, readKey, writeKey } : null;
}

function headers(key: string, extra?: Record<string, string>): Record<string, string> {
  // New sb_… keys go in `apikey` only; legacy JWT keys also as a bearer token.
  return {
    apikey: key,
    ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
    "Content-Type": "application/json",
    ...extra,
  };
}

async function request<T>(env: SupabaseEnv, key: string, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: headers(key, init.headers as Record<string, string>),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${await res.text()}`);
  // Inserts with return=minimal answer 201 with an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Calls a Postgres function, e.g. rpc("search_cars", { p_max_price: 40000000 }). */
export function rpc<T>(env: SupabaseEnv, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return request<T>(env, env.readKey, `rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
}

/** GET on a table or view, `query` being PostgREST filters ("id=in.(car-001)&select=*"). */
export function select<T>(env: SupabaseEnv, table: string, query: string): Promise<T> {
  return request<T>(env, env.readKey, `${table}?${query}`, { method: "GET" });
}

/** Inserts rows with the secret key; resolves to false when no secret key is configured. */
export async function insert(env: SupabaseEnv, table: string, rows: object | object[], upsert = false): Promise<boolean> {
  if (!env.writeKey) return false;
  await request(env, env.writeKey, table, {
    method: "POST",
    body: JSON.stringify(rows),
    headers: { Prefer: `return=minimal${upsert ? ",resolution=ignore-duplicates" : ""}` },
  });
  return true;
}
