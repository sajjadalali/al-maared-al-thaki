"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/cn";

/** The round heart on a car card's photo. */
export function CarFavoriteIcon({ id }: { id: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(id);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      aria-pressed={favorite}
      className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 transition hover:scale-105"
    >
      <Heart className={cn("h-4.5 w-4.5", favorite ? "fill-danger text-danger" : "text-brand-900")} />
    </button>
  );
}

export function CarFavoriteToggle({ id, compact }: { id: string; compact?: boolean }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(id);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={favorite}
      className={cn(
        "flex items-center gap-2 rounded-full border font-bold transition",
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        favorite
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-black/10 text-neutral-600 hover:bg-surface"
      )}
    >
      <Heart className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", favorite && "fill-danger")} />
      {favorite ? "في المفضلة" : compact ? "حفظ" : "إضافة إلى المفضلة"}
    </button>
  );
}
