export function QuickActions({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-100"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
