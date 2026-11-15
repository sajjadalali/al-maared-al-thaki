import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { SadeemShowcase } from "@/components/home/SadeemShowcase";
import { sadeemScenes, toSceneSource } from "@/components/home/sadeemScenes";
import { getCatalog } from "@/server/catalog";

/** Who Sadeem is and what he does, shown rather than listed. */
export async function SadeemSection() {
  // The stock the scenes are made from: the server renders a fixed set, and the
  // browser remakes them for this visitor (random, or about what they want).
  const cars = (await getCatalog()).getAllCars().filter((car) => car.status === "متوفرة").map(toSceneSource);
  const scenes = sadeemScenes(cars);

  return (
    <section className="bg-[linear-gradient(180deg,#eef2f7_0%,#e4eaf3_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SadeemShowcase
          scenes={scenes}
          cars={cars}
          intro={
            <>
              <h2 className="text-3xl font-bold leading-tight text-brand-950 sm:text-[40px] sm:leading-[1.2]">سديم، مساعدك الشخصي لشراء سيارتك</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-8 text-neutral-600">
                تحچي وياه بكلامك مثل ما تحچي ويا واحد يفتهم بالسيارات: يسمع طلبك، يجيبلك اللي يناسبك من السيارات
                المتوفرة، يقارنلك ويحللك الفرق، ويبقى وياك لحد ما تختار. وإذا عندك سؤال عن المعرض نفسه، هم يجاوبك.
              </p>
            </>
          }
          outro={
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <OpenChatButton className="min-h-12 rounded-full bg-brand-950 px-6 text-[15px] font-bold text-white transition hover:bg-brand-800 active:scale-95">
                اكتب سؤالك إنت
              </OpenChatButton>
              <p className="text-sm text-neutral-500">يجاوبك بأي وقت، ومن سيارات المعرض بس.</p>
            </div>
          }
        />
      </div>
    </section>
  );
}
