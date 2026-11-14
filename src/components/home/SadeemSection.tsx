import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { SadeemShowcase } from "@/components/home/SadeemShowcase";
import { sadeemScenes } from "@/components/home/sadeemScenes";
import { getCatalog } from "@/server/catalog";

/** Who Sadeem is and what he does, shown rather than listed. */
export async function SadeemSection() {
  const scenes = sadeemScenes(await getCatalog());

  return (
    <section className="bg-brand-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SadeemShowcase
          scenes={scenes}
          intro={
            <>
              <h2 className="text-3xl font-bold leading-tight sm:text-[40px] sm:leading-[1.2]">سديم، موظف المبيعات أونلاين</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-8 text-white/65">
                يعمل كما يعمل موظف المبيعات في المعرض: يسمع طلبك، يرشّح لك من السيارات المتوفرة، يقارن بينها، ويسجّل
                طلبك لتجربة القيادة. وهو أيضاً من يجيبك عن أسئلة المعرض نفسه.
              </p>
            </>
          }
          outro={
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <OpenChatButton className="min-h-12 rounded-full bg-white px-6 text-[15px] font-bold text-brand-950 transition hover:bg-brand-100 active:scale-95">
                اكتب سؤالك أنت
              </OpenChatButton>
              <p className="text-sm text-white/45">يجيب في أي وقت، من سيارات المعرض فقط.</p>
            </div>
          }
        />
      </div>
    </section>
  );
}
