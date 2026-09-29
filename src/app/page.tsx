import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { FeaturedCars } from "@/components/home/FeaturedCars";
import { StatsBanner } from "@/components/home/StatsBanner";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <FeaturedCars />
      <StatsBanner />
    </>
  );
}
