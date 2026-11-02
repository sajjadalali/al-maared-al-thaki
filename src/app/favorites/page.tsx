import type { Metadata } from "next";
import { toCarSummary } from "@/data/cars";
import { getCatalog } from "@/server/catalog";
import { FavoritesList } from "@/components/favorites/FavoritesList";

export const metadata: Metadata = {
  title: "سياراتي المفضلة",
};

export default async function FavoritesPage() {
  return <FavoritesList cars={(await getCatalog()).getAllCars().map(toCarSummary)} />;
}
