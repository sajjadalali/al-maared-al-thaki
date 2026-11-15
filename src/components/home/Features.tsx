import { KeyRound } from "lucide-react";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { SadeemMascot } from "@/components/ui/SadeemMascot";

// After the buyer picks a car: what the showroom does, in the order it
// happens, from the inspection to the keys. The hero and Sadeem's section
// cover choosing; this one covers buying. Each step carries the question a
// buyer asks about it, which Sadeem answers from the showroom's policies
// (showroom_info), so the facts here must match that table.
const STEPS = [
  {
    title: "تعاينها وتفحصها قبل ما تدفع",
    text: "تجي للمعرض، تشوف السيارة بعينك وتتأكد إن مواصفاتها مثل المكتوب. إحنا فاحصين محركها وگيرها وهيكلها وصبغها، وإذا تحب خذها لفاحص من عندك بوجود موظف من المعرض.",
    ask: "أگدر أفحصها عند فاحص من عندي؟",
  },
  {
    title: "سيارتك القديمة تنحسب",
    text: "جيبها للمعرض ونقيّمها، وقيمتها تنخصم من سعر سيارتك الجديدة.",
    ask: "أگدر أبدل سيارتي القديمة؟",
  },
  {
    title: "تدفع بالطريقة اللي تناسبك",
    text: "كاش أو تحويل مصرفي، أو أقساط ويا المصارف المعتمدة بدفعة أولى تبدي من 30% ولغاية 36 شهر.",
    ask: "عدكم أقساط؟",
  },
  {
    title: "أوراقك علينا",
    text: "نتابع وياك المرور والتسجيل ونقل الملكية لحد ما تكون سيارتك جاهزة باسمك.",
    ask: "المعرض يسوي التسجيل ونقل الملكية؟",
  },
  {
    title: "تستلم مفتاحك",
    text: "تستلم سيارتك من المعرض وأوراقها كاملة. الجديدة عليها ضمان الوكيل، والمستعملة 3 أشهر على المحرك والگير.",
    ask: "السيارات عليها ضمان؟",
  },
];

export function Features() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8 lg:py-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[28px] font-bold leading-tight text-brand-950 sm:text-[38px] sm:leading-[1.2]">
            اخترت سيارتك؟
            <br />
            الباقي علينا.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-8 text-neutral-600">
            من الفحص لحد ما تستلم المفتاح، فريق المعرض يكمّل وياك خطوة بخطوة. وأي سؤال عن خطوة منها، سديم يجاوبك عليه هسه.
          </p>
        </div>

        <ol className="relative">
          {STEPS.map((step, i) => {
            const last = i === STEPS.length - 1;
            return (
              <li key={step.title} className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 pb-10 last:pb-0 sm:gap-x-6">
                {/* The road between the steps: it runs from each marker down to the next. */}
                {!last && <span aria-hidden className="absolute start-[1.3rem] top-12 bottom-1 w-0.5 rounded-full bg-brand-100" />}
                <span
                  aria-hidden
                  className={
                    last
                      ? "relative flex h-11 w-11 items-center justify-center rounded-full bg-accent-400 text-brand-950"
                      : "relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-950 bg-white text-[17px] font-bold text-brand-950"
                  }
                >
                  {last ? <KeyRound className="h-5 w-5" strokeWidth={2.25} /> : i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-[19px] font-bold leading-8 text-brand-950">{step.title}</h3>
                  <p className="mt-1.5 max-w-xl text-[15px] leading-8 text-neutral-600">{step.text}</p>
                  <OpenChatButton
                    prompt={step.ask}
                    className="group mt-3.5 inline-flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 pe-4 ps-1.5 text-[14px] font-semibold text-brand-900 ring-1 ring-black/[0.06] transition hover:bg-brand-50 hover:ring-brand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/[0.06]">
                      <SadeemMascot className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="sr-only">اسأل سديم: </span>«{step.ask}»
                    </span>
                  </OpenChatButton>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
