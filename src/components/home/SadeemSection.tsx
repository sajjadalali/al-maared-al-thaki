import { MessageCircle, SearchCheck, Wallet } from "lucide-react";
import { SadeemPhone } from "@/components/home/SadeemPhone";
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
      {/* one quiet light behind the phone, nothing else */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 w-full bg-[radial-gradient(ellipse_at_center,rgba(80,120,190,0.22),transparent_60%)] lg:w-1/2"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-24 lg:px-8 lg:py-24">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold leading-tight sm:text-[40px] sm:leading-[1.2]">
            تعرّف على سديم،
            <br />
            موظف المبيعات المتوفر دائماً
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-white/65">
            بدلاً من التنقل بين الصفحات، اكتب لسديم ما تبحث عنه، فيرشّح لك من سيارات المعرض ويوصلك
            بفريق المبيعات على واتساب عندما تقرر.
          </p>

          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {ABILITIES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 py-5">
                <Icon className="mt-1 h-5 w-5 shrink-0 text-accent-300" />
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm leading-7 text-white/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <p className="text-sm font-semibold text-white/55">جرّب تسأله:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <OpenChatButton
                  key={prompt}
                  prompt={prompt}
                  className="min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10"
                >
                  {prompt}
                </OpenChatButton>
              ))}
            </div>
          </div>
        </div>

        <SadeemPhone />
      </div>
    </section>
  );
}
