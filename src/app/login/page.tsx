import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "تسجيل الدخول | المعرض الذكي",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Lock className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-brand-950">تسجيل الدخول والحسابات قريباً</h1>
      <p className="mt-2 text-sm leading-7 text-neutral-500">
        نعمل حالياً على تفعيل الحسابات الشخصية لحفظ سياراتك المفضلة وطلباتك. بإمكانك تصفح
        الموقع كاملاً والتحدث مع سديم من دون الحاجة لحساب.
      </p>
      <Link
        href="/"
        className="mt-6 flex items-center gap-1.5 rounded-xl bg-brand-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>
    </div>
  );
}
