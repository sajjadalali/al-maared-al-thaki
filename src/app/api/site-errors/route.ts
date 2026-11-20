import { saveSiteError } from "@/server/siteErrors";

// The browser's error reports (src/lib/errorReporter.ts), sent with
// sendBeacon as plain text. Always 204: the page does nothing with the answer.

const MAX_BODY = 16_000;
const KINDS = new Set(["js-error", "promise-rejection", "resource-failed", "css-missing", "error-boundary", "global-error"]);

// A visitor's page sends at most 8; a few pages' worth per window.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return done;

  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return done;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return done;
  }
  if (!body || typeof body !== "object" || typeof body.kind !== "string" || !KINDS.has(body.kind)) return done;

  const extra = body.extra && typeof body.extra === "object" ? (body.extra as Record<string, unknown>) : {};
  await saveSiteError({
    side: "browser",
    kind: body.kind,
    message: typeof body.message === "string" ? body.message : null,
    detail: typeof body.detail === "string" ? body.detail : null,
    page: typeof body.page === "string" ? body.page : null,
    userAgent: request.headers.get("user-agent"),
    extra: { ...extra, viewport: typeof body.viewport === "string" ? body.viewport.slice(0, 20) : undefined },
  });
  return done;
}
