"use client";

import { useEffect } from "react";
import { reportCaughtError } from "@/lib/errorReporter";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { site, whatsappHref } from "@/config/site";

// A page failed to load (18 Nov: it was Next's default page, in English). The
// header, footer and Sadeem stay; this replaces only the page.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    reportCaughtError("error-boundary", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <TriangleAlert className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-brand-950">ما گدرنا نفتح الصفحة</h1>
      <p className="mt-2 text-sm leading-7 text-neutral-500">
        صار خلل من عدنا، مو منك. جرّب مرة ثانية، وإذا بقى،{" "}
        <a href={whatsappHref()} className="font-semibold text-brand-800 underline underline-offset-4">
          راسلنا على الواتساب
        </a>{" "}
        أو اتصل على{" "}
        <bdi dir="ltr" className="whitespace-nowrap">
          {site.phone}
        </bdi>
        .
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={() => retry()}
          className="flex items-center gap-1.5 rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
        >
          <RotateCw className="h-4 w-4" />
          جرّب مرة ثانية
        </button>
        <Link href="/" className="rounded-xl px-5 py-2.5 text-sm font-bold text-brand-900 ring-1 ring-brand-950/10 hover:bg-brand-50">
          ارجع للرئيسية
        </Link>
      </div>
    </div>
  );
}
