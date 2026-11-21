import { CarQuickSearch } from "@/components/cars/CarQuickSearch";
import { SectionHeading } from "@/components/home/SectionHeading";
import { toFacetCar } from "@/data/cars";
import { getCatalog } from "@/server/catalog";

/**
 * The quick search (make, model, price), as its own section right above the
 * picked cars and after Sadeem's (21 Nov, the owner's call; it was in the
 * hero, under the buttons on phones and on its lower edge on computers).
 */
export async function HomeSearch() {
  const catalog = await getCatalog();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <SectionHeading eyebrow="بحث سريع" title="دوّر على سيارتك بنفسك" />
      <CarQuickSearch cars={catalog.getAllCars().map(toFacetCar)} />
    </section>
  );
}
