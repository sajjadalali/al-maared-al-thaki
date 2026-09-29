import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tr-sm border border-black/5 bg-surface px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-brand-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
