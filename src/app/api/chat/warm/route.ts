import { supabaseEnv } from "@/server/supabase";
import { openRouterEnv, warmSadeem } from "@/server/sadeem/agent";

// Sent when a visitor opens the chat, so Sadeem's first reply finds the model's
// cache already filled (see warmSadeem). It costs at most one small model call
// every few minutes for the whole site, so it needs no per-visitor limit.
export async function POST() {
  const llm = openRouterEnv();
  const db = supabaseEnv();
  if (!llm || !db) return Response.json({ warmed: false });
  try {
    return Response.json(await warmSadeem(llm, db));
  } catch (err) {
    console.error("[sadeem] warm-up failed:", err);
    return Response.json({ warmed: false, error: true });
  }
}
