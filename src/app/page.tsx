import { Hero } from "@/components/home/Hero";
import { BodyTypes } from "@/components/home/BodyTypes";
import { FeaturedCars } from "@/components/home/FeaturedCars";
import { SadeemSection } from "@/components/home/SadeemSection";
import { Brands } from "@/components/home/Brands";
import { Features } from "@/components/home/Features";
import { VisitCta } from "@/components/home/VisitCta";

export default function Home() {
  return (
    <>
      {/* Browsing (types, makes, cars), then Sadeem who helps choose, then what
          the showroom does once a car is chosen, then the visit. */}
      <Hero />
      <BodyTypes />
      <Brands />
      <FeaturedCars />
      <SadeemSection />
      <Features />
      <VisitCta />
    </>
  );
}
