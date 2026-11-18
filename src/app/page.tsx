import { Hero } from "@/components/home/Hero";
import { BodyTypes } from "@/components/home/BodyTypes";
import { FeaturedCars } from "@/components/home/FeaturedCars";
import { SadeemSection } from "@/components/home/SadeemSection";
import { Brands } from "@/components/home/Brands";
import { Features } from "@/components/home/Features";
import { VisitCta } from "@/components/home/VisitCta";

export default function Home() {
  return (
    // Computers: browsing (types, makes, cars), then Sadeem who helps choose,
    // then what the showroom does once a car is chosen, then the visit.
    // Phones (19 Nov): Sadeem comes right after the hero. Below the cars it
    // was almost 5 screens down, and he is what the site is about.
    // `*:w-full`: in a flex column the sections centred with mx-auto would
    // otherwise shrink to their content (and the car strip overflow on phones).
    <div className="flex flex-col *:w-full">
      <div className="order-first">
        <Hero />
      </div>
      <BodyTypes />
      <Brands />
      <FeaturedCars />
      <div className="-order-1 lg:order-none">
        <SadeemSection />
      </div>
      <Features />
      <VisitCta />
    </div>
  );
}
