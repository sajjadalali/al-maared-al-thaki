// Runs once when the server starts (Next.js calls register). Starts the site's
// background jobs: the hourly database check and the weekly backup
// (src/server/upkeep.ts). Node.js only; not during builds or in the browser.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { supabaseEnv } = await import("@/server/supabase");
  const { startUpkeep } = await import("@/server/upkeep");
  startUpkeep(supabaseEnv());
}
