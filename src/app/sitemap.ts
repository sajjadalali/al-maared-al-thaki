import type { MetadataRoute } from "next";
import { getAllCars } from "@/data/cars";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/cars", "/about", "/contact"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const cars = getAllCars()
    .filter((car) => car.status !== "مباعة")
    .map((car) => ({
      url: `${site.url}/cars/${car.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  return [...pages, ...cars];
}
