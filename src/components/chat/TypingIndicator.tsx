import { SadeemMark } from "@/components/ui/SadeemMark";

/** Sadeem is working; `label` says on what ("سديم يدوّر بالسيارات…"). */
export function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex flex-row-reverse items-start justify-start gap-2 animate-msg-in" role="status" aria-label={label ?? "سديم يكتب"}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-950 ring-1 ring-brand-950/10">
        <SadeemMark compact animated tone="light" className="w-[19px]" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-black/[0.04] bg-white px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-brand-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
        {label && <span className="ms-2 text-[13px] text-neutral-500">{label}</span>}
      </div>
    </div>
  );
}
