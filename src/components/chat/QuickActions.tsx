export function QuickActions({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t border-black/5 bg-white px-3 py-2.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className="rounded-full border border-brand-200 bg-brand-50/70 px-3.5 py-1.5 text-[13px] font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-100"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
