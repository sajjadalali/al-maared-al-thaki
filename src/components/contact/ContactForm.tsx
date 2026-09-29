"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-base font-bold text-brand-950">تم استلام رسالتك بنجاح</p>
        <p className="max-w-sm text-sm text-neutral-500">
          شكراً لتواصلك معنا، فريقنا راح يرجع لك بأقرب وقت ممكن.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" placeholder="اسمك" required />
        <Field label="رقم الهاتف" placeholder="07xx xxx xxxx" type="tel" dir="ltr" required />
      </div>
      <Field label="البريد الإلكتروني (اختياري)" placeholder="example@email.com" type="email" dir="ltr" />
      <div>
        <label className="mb-1.5 block text-xs font-bold text-neutral-500">رسالتك</label>
        <textarea
          required
          rows={5}
          placeholder="اكتب استفسارك هنا..."
          className="w-full resize-none rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
      >
        <Send className="h-4 w-4" />
        إرسال الرسالة
      </button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  dir,
  required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-neutral-500">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        dir={dir}
        required={required}
        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
      />
    </div>
  );
}
