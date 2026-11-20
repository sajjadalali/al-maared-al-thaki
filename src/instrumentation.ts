// Runs once when the server starts (Next.js calls register). Starts the site's
// background jobs: the hourly database check and the weekly backup
// (src/server/upkeep.ts), and warming the pages and car photos after a deploy
// (src/server/warmup.ts). Node.js only; not during builds or in the browser.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { supabaseEnv } = await import("@/server/supabase");
  const { startUpkeep } = await import("@/server/upkeep");
  startUpkeep(supabaseEnv());
  const { startWarmup } = await import("@/server/warmup");
  startWarmup();
}

// A server error while rendering a page or answering a route (20 Nov): saved
// to `site_errors` with its digest, the same id the visitor's error page
// reports, so the two can be matched (src/server/siteErrors.ts).
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routePath?: string; routeType?: string; renderSource?: string; revalidateReason?: string }
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (request.path.startsWith("/api/site-errors")) return;
  const err = error instanceof Error ? error : null;
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest?: unknown }).digest) : undefined;
  const userAgent = request.headers["user-agent"];
  const { saveSiteError } = await import("@/server/siteErrors");
  await saveSiteError({
    side: "server",
    kind: [context.routeType, context.renderSource].filter(Boolean).join(":") || "server",
    message: err?.message ?? String(error),
    detail: err?.stack ?? null,
    page: `${request.method} ${request.path}`,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    extra: { digest, routePath: context.routePath, revalidateReason: context.revalidateReason },
  });
}
