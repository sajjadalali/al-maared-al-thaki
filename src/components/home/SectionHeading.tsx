import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <p className="flex items-center gap-2 text-[13px] font-bold text-accent-600">
          <span className="h-[3px] w-5 rounded-full bg-accent-400" />
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-brand-950 sm:text-[30px] sm:leading-tight">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-500 sm:text-[15px]">{description}</p>}
      </div>
      {link && (
        <Link
          href={link.href}
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 px-4 py-2 text-sm font-bold text-brand-900 transition hover:border-black/20 hover:bg-surface sm:flex"
        >
          {link.label}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
