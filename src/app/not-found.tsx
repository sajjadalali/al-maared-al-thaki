import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <SearchX className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-brand-950">الصفحة مو موجودة</h1>
      <p className="mt-2 text-sm leading-7 text-neutral-500">
        الصفحة أو السيارة اللي تدوّرها مو موجودة، أو انباعت. تصفّح السيارات المتوفرة، أو احچي
        ويا سديم ويلگيلك اللي تريده.
      </p>
      <Link
        href="/cars"
        className="mt-6 flex items-center gap-1.5 rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        تصفّح السيارات
      </Link>
    </div>
  );
}
