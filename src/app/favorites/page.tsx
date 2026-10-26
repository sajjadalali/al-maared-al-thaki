import type { Metadata } from "next";
import { getAllCars, toCarSummary } from "@/data/cars";
import { FavoritesList } from "@/components/favorites/FavoritesList";

export const metadata: Metadata = {
  title: "سياراتي المفضلة",
};

export default function FavoritesPage() {
  return <FavoritesList cars={getAllCars().map(toCarSummary)} />;
}
