"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { site, whatsappHref } from "@/config/site";
import { iraqiMobile } from "@/lib/phone";

type State =
  | { kind: "form"; phoneError?: string; sending?: boolean }
  // Stored and sent to the team; WhatsApp stays offered for whoever wants it.
  | { kind: "sent"; phone: string; link: string }
  // Could not be stored or sent: the message goes to WhatsApp, so nothing is lost.
  | { kind: "whatsapp"; link: string; why: string };

const PHONE_ERROR = "اكتب رقم موبايل عراقي كامل: 11 رقماً يبدأ بـ 07";

// The request is saved (leads, source "form") and the sales team gets it on
// Telegram, like the numbers Sadeem takes; WhatsApp is the fallback.
export function ContactForm() {
  const [state, setState] = useState<State>({ kind: "form" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const phone = iraqiMobile(String(data.get("phone") ?? ""));
    if (!phone) {
      setState({ kind: "form", phoneError: PHONE_ERROR });
      return;
    }
    const link = whatsappHref([`الاسم: ${name}`, `الهاتف: ${phone}`, "", message].join("\n"));
    setState({ kind: "form", sending: true });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        setState({ kind: "sent", phone, link });
        return;
      }
      const { error } = await res.json().catch(() => ({ error: "" }));
      if (error === "bad_phone") return setState({ kind: "form", phoneError: PHONE_ERROR });
      if (error === "showroom_phone") return setState({ kind: "form", phoneError: "هذا رقم المعرض، اكتب رقمك أنت" });
      setState({
        kind: "whatsapp",
        link,
        why: res.status === 429 ? "أرسلت عدة طلبات خلال وقت قصير." : "تعذّر إرسال طلبك من هنا الآن.",
      });
    } catch {
      setState({ kind: "whatsapp", link, why: "تعذّر إرسال طلبك من هنا الآن." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-base font-bold text-brand-950">وصل طلبك</p>
        <p className="max-w-sm text-sm leading-7 text-neutral-500">
          سيتصل بك فريق المبيعات على <bdi dir="ltr">{state.phone}</bdi> خلال أوقات الدوام ({site.hours}).
        </p>
        <a
          href={state.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold text-brand-900 hover:bg-surface"
        >
          <WhatsappIcon className="h-4 w-4 text-[#1fa855]" />
          أو راسلنا على واتساب الآن
        </a>
      </div>
    );
  }

  if (state.kind === "whatsapp") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-bold text-brand-950">{state.why}</p>
        <p className="max-w-sm text-sm leading-7 text-neutral-500">
          رسالتك جاهزة في واتساب: اضغط الزر ثم «إرسال» لتصل إلى فريق المبيعات.
        </p>
        <a
          href={state.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 rounded-xl bg-[#1fa855] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a9149]"
        >
          <WhatsappIcon className="h-4 w-4" />
          إرسال عبر واتساب
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="name" label="الاسم الكامل" placeholder="اسمك" required />
        <Field
          name="phone"
          label="رقم الهاتف"
          placeholder="07xx xxx xxxx"
          type="tel"
          inputMode="tel"
          dir="ltr"
          required
          error={state.phoneError}
          onInput={() => state.phoneError && setState({ kind: "form" })}
        />
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
          maxLength={1000}
          placeholder="اكتب استفسارك هنا..."
          className="w-full resize-none rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <button
        type="submit"
        disabled={state.sending}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-wait disabled:opacity-70"
      >
        {state.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
        {state.sending ? "جارٍ الإرسال…" : "إرسال الطلب"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  inputMode,
  placeholder,
  dir,
  required,
  error,
  onInput,
}: {
  name: string;
  label: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
  error?: string;
  onInput?: () => void;
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
        inputMode={inputMode}
        placeholder={placeholder}
        dir={dir}
        required={required}
        maxLength={name === "name" ? 80 : 40}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        onInput={onInput}
        className={`min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 ${error ? "border-danger" : "border-black/10"}`}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
