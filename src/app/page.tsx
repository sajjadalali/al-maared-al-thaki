import { Hero } from "@/components/home/Hero";
import { BodyTypes } from "@/components/home/BodyTypes";
import { FeaturedCars } from "@/components/home/FeaturedCars";
import { SadeemSection } from "@/components/home/SadeemSection";
import { Brands } from "@/components/home/Brands";
import { HomeSearch } from "@/components/home/HomeSearch";
import { Features } from "@/components/home/Features";
import { VisitCta } from "@/components/home/VisitCta";

export default function Home() {
  return (
    // 21 Nov (the owner's call): Sadeem, then the quick search, then the picked
    // cars, on every screen. Computers: the hero, types and makes, then those
    // three, then what the showroom does once a car is chosen, then the visit.
    // Phones: the three right after the hero, then types and makes (20 Nov: a
    // buyer comes to see cars, so the cars came up from 6 screens down).
    // `*:w-full`: in a flex column the sections centred with mx-auto would
    // otherwise shrink to their content (and the car strip overflow on phones).
    <div className="flex flex-col *:w-full">
      <div className="order-first">
        <Hero />
      </div>
      <BodyTypes />
      <Brands />
      <div className="-order-3 lg:order-none">
        <SadeemSection />
      </div>
      <div className="-order-2 lg:order-none">
        <HomeSearch />
      </div>
      <div className="-order-1 lg:order-none">
        <FeaturedCars />
      </div>
      <Features />
      <VisitCta />
    </div>
  );
}
