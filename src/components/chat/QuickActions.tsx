// Sadeem's suggestions under the conversation: one row that scrolls sideways,
// so on a phone it never takes more than one line from the messages (15 Nov:
// three suggestions wrapped to two or three rows and covered the chat).
export function QuickActions({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    // While the buyer types (keyboard up) the suggestions step aside: the
    // messages keep the room and the input sits on the keyboard (20 Nov).
    <div className="relative shrink-0 border-t border-black/5 bg-white group-data-[keyboard]/frame:hidden">
      <div
        role="group"
        aria-label="اقتراحات"
        className="no-scrollbar flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain scroll-px-3 px-3 py-1.5"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className="min-h-10 shrink-0 snap-start whitespace-nowrap rounded-full border border-brand-200 bg-brand-50/70 px-3.5 py-1.5 text-[13px] font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-100 active:scale-[0.97]"
          >
            {option}
          </button>
        ))}
      </div>
      {/* A soft edge where the row runs off the screen (the left, in Arabic), so it reads as scrollable. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
    </div>
  );
}
