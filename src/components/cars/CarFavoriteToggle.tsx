"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/cn";

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
