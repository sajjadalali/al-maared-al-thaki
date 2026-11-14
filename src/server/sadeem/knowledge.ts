// Sadeem's knowledge base: the showroom's policies (installments, warranty,
// inspection, trade-in, papers, booking, delivery, payment) from the
// `showroom_info` table. Cars are searched with tools; contact details live in
// site.ts. Refreshed every minute, like the stock overview.
import { CATALOG_REVALIDATE } from "@/server/catalog";
import { select, type SupabaseEnv } from "@/server/supabase";

/** Which showroom's rows to use. One page per dealer later picks its own slug. */
export const DEALER_SLUG = "demo";

interface InfoRow {
  category: string;
  question: string;
  answer: string;
}

let cache: { at: number; value: string } | null = null;
const TTL_MS = CATALOG_REVALIDATE * 1000;

/** The showroom's policies as "question → answer" lines, or "" when there are none. */
export async function showroomPolicies(env: SupabaseEnv): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const rows = await select<InfoRow[]>(
      env,
      "showroom_info",
      `dealer_slug=eq.${DEALER_SLUG}&is_active=is.true&select=category,question,answer&order=category,position`,
    );
    const value = rows.map((r) => `- [${r.category}] ${r.question} → ${r.answer}`).join("\n");
    cache = { at: Date.now(), value };
    return value;
  } catch (error) {
    // Without the table Sadeem still works: it sends policy questions to the team (R2).
    console.error("showroom_info:", error);
    return cache?.value ?? "";
  }
}
