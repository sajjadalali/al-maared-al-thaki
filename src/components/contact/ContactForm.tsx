"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { whatsappHref } from "@/config/site";

// No backend yet: the form composes the message and hands it to WhatsApp,
// so nothing the visitor writes is silently lost.
export function ContactForm() {
  const [link, setLink] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = [
      `الاسم: ${data.get("name")}`,
      `الهاتف: ${data.get("phone")}`,
      "",
      String(data.get("message")),
    ].join("\n");
    const href = whatsappHref(text);
    setLink(href);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  if (link) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-base font-bold text-brand-950">تم تجهيز رسالتك في واتساب</p>
        <p className="max-w-sm text-sm leading-7 text-neutral-500">
          اضغط «إرسال» داخل واتساب لتصل رسالتك إلى فريق المبيعات. إذا لم تُفتح النافذة، استخدم
          الزر أدناه.
        </p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 rounded-xl bg-[#1fa855] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a9149]"
        >
          <WhatsappIcon className="h-4 w-4" />
          فتح واتساب
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="name" label="الاسم الكامل" placeholder="اسمك" required />
        <Field name="phone" label="رقم الهاتف" placeholder="07xx xxx xxxx" type="tel" dir="ltr" required />
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-xs font-bold text-neutral-500">
          رسالتك
        </label>
        <textarea
          id="message"
          name="message"
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
        <WhatsappIcon className="h-4 w-4" />
        إرسال عبر واتساب
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  dir,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-bold text-neutral-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        dir={dir}
        required={required}
        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
      />
    </div>
  );
}
