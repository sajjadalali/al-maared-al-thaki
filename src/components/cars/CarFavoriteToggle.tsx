"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/cn";

export function CarFavoriteToggle({ id }: { id: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(id);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={favorite}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
        favorite
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-black/10 text-neutral-600 hover:bg-surface"
      )}
    >
      <Heart className={cn("h-4 w-4", favorite && "fill-danger")} />
      {favorite ? "في المفضلة" : "إضافة إلى المفضلة"}
    </button>
  );
}
