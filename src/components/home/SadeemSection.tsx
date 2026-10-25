import { MessageCircle, SearchCheck, Sparkles, Wallet } from "lucide-react";
import { HeroChatPreview } from "@/components/home/HeroChatPreview";
import { OpenChatButton } from "@/components/chat/OpenChatButton";

const ABILITIES = [
  { icon: MessageCircle, title: "يفهم لهجتك", text: "اكتب بلهجتك العراقية، مثل: «أريد SUV عائلية بحدود 40 مليون» أو «عندكم لاندكروزر خليجي؟»." },
  { icon: SearchCheck, title: "يبحث بسيارات المعرض فقط", text: "كل سيارة يرشّحها موجودة فعلاً بالمعرض، بسعرها ومواصفاتها الحالية." },
  { icon: Wallet, title: "يرتّب حسب ميزانيتك", text: "يحسب الميزانية بالدينار أو الدولار ويعرض الأقرب لطلبك أولاً." },
];

const PROMPTS = [
  "أريد SUV عائلية 7 مقاعد",
  "عندكم لاندكروزر خليجي؟",
  "سيارة اقتصادية بحدود 25 مليون",
  "شنو أرخص سيارة جديدة عندكم؟",
];

export function SadeemSection() {
  return (
    <section className="relative overflow-hidden bg-brand-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -start-40 top-0 h-[480px] w-[480px] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute -end-32 bottom-0 h-[380px] w-[380px] rounded-full bg-accent-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-bold text-accent-300">
            <Sparkles className="h-4 w-4" />
            مساعد المبيعات الذكي
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-[40px] sm:leading-[1.2]">
            تعرّف على سديم،
            <br />
            موظف المبيعات المتوفر دائماً
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-8 text-white/65">
            بدلاً من التنقل بين الصفحات، اكتب لسديم ما تبحث عنه، فيرشّح لك من سيارات المعرض ويوصلك
            بفريق المبيعات على واتساب عندما تقرر.
          </p>

          <div className="mt-8 space-y-5">
            {ABILITIES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-accent-300 ring-1 ring-white/10">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-0.5 text-sm leading-7 text-white/60">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold text-white/45">جرّب تسأله:</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <OpenChatButton
                  key={prompt}
                  prompt={prompt}
                  className="rounded-full bg-white/[0.07] px-4 py-2 text-[13px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  {prompt}
                </OpenChatButton>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <HeroChatPreview />
        </div>
      </div>
    </section>
  );
}
