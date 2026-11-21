"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { site, whatsappHref } from "@/config/site";
import { iraqiMobile } from "@/lib/phone";

type FieldName = "name" | "phone" | "message";
type Errors = Partial<Record<FieldName, string>>;

type State =
  | { kind: "form"; errors?: Errors; sending?: boolean }
  // Stored and sent to the team; WhatsApp stays offered for whoever wants it.
  | { kind: "sent"; phone: string; link: string }
  // Could not be stored or sent: the message goes to WhatsApp, so nothing is lost.
  | { kind: "whatsapp"; link: string; why: string };

const PHONE_ERROR = "اكتب رقم موبايل عراقي كامل: 11 رقم يبدي بـ 07";

// The site checks the fields itself, in Arabic (21 Nov): the browser's own
// check spoke the phone's language ("Please fill out this field" on English
// phones). The first field that needs something gets the focus.
function check(name: string, phone: string, rawPhone: string, message: string): Errors {
  const errors: Errors = {};
  if (!name) errors.name = "اكتب اسمك";
  if (!rawPhone.trim()) errors.phone = "اكتب رقم موبايلك حتى نتصل بيك";
  else if (!phone) errors.phone = PHONE_ERROR;
  if (!message) errors.message = "اكتب سؤالك أو شنو تحتاج";
  return errors;
}

// The request is saved (leads, source "form") and the sales team gets it on
// Telegram, like the numbers Sadeem takes; WhatsApp is the fallback.
export function ContactForm() {
  const [state, setState] = useState<State>({ kind: "form" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const rawPhone = String(data.get("phone") ?? "");
    const phone = iraqiMobile(rawPhone);
    const errors = check(name, phone ?? "", rawPhone, message);
    const first = (["name", "phone", "message"] as const).find((f) => errors[f]);
    if (first || !phone) {
      setState({ kind: "form", errors });
      form.querySelector<HTMLElement>(`[name="${first ?? "phone"}"]`)?.focus();
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
      if (error === "bad_phone") return setState({ kind: "form", errors: { phone: PHONE_ERROR } });
      if (error === "showroom_phone") return setState({ kind: "form", errors: { phone: "هذا رقم المعرض، اكتب رقمك إنت" } });
      setState({
        kind: "whatsapp",
        link,
        why: res.status === 429 ? "دزيت طلبات هواية بوقت قصير." : "ما گدرنا ندز طلبك من هنا هسه.",
      });
    } catch {
      setState({ kind: "whatsapp", link, why: "ما گدرنا ندز طلبك من هنا هسه." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="text-base font-bold text-brand-950">وصل طلبك</p>
        <p className="max-w-sm text-sm leading-7 text-neutral-500">
          فريق المبيعات يتصل بيك على <bdi dir="ltr">{state.phone}</bdi> بأوقات الدوام ({site.hours}).
        </p>
        <a
          href={state.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold text-brand-900 hover:bg-surface"
        >
          <WhatsappIcon className="h-4 w-4 text-[#1fa855]" />
          أو راسلنا على الواتساب هسه
        </a>
      </div>
    );
  }

  if (state.kind === "whatsapp") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-bold text-brand-950">{state.why}</p>
        <p className="max-w-sm text-sm leading-7 text-neutral-500">
          رسالتك جاهزة بالواتساب: اضغط الزر وبعدين «إرسال» حتى توصل لفريق المبيعات.
        </p>
        <a
          href={state.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 rounded-xl bg-[#1fa855] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a9149]"
        >
          <WhatsappIcon className="h-4 w-4" />
          دزها على الواتساب
        </a>
      </div>
    );
  }

  const errors = state.kind === "form" ? (state.errors ?? {}) : {};
  // Typing in a field clears its message.
  const clear = (field: FieldName) => () => {
    if (state.kind === "form" && state.errors?.[field]) setState({ kind: "form", errors: { ...state.errors, [field]: undefined } });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="name"
          label="الاسم الكامل"
          placeholder="اسمك"
          autoComplete="name"
          required
          error={errors.name}
          onInput={clear("name")}
        />
        <Field
          name="phone"
          label="رقم الهاتف"
          placeholder="07xx xxx xxxx"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
          error={errors.phone}
          onInput={clear("phone")}
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
          placeholder="اكتب سؤالك هنا..."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          onInput={clear("message")}
          className={`w-full resize-none rounded-xl border px-3.5 py-2.5 text-base outline-none focus:border-brand-400 sm:text-sm ${errors.message ? "border-danger" : "border-black/10"}`}
        />
        {errors.message && (
          <p id="message-error" role="alert" className="mt-1.5 text-xs font-semibold text-danger">
            {errors.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={state.sending}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-wait disabled:opacity-70"
      >
        {state.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
        {state.sending ? "دا ينرسل…" : "دز الطلب"}
      </button>
      <p className="text-center text-[12.5px] leading-6 text-neutral-500">
        رقمك يوصل لفريق المبيعات بس.{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-brand-800">
          شلون نتعامل ويا بياناتك
        </Link>
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  inputMode,
  autoComplete,
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
  autoComplete?: string;
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
      {/* 16px on phones (21 Nov): smaller text makes iPhone Safari zoom the page in on focus. */}
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        dir={dir}
        required={required}
        maxLength={name === "name" ? 80 : 40}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        onInput={onInput}
        className={`min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-base outline-none sm:text-sm focus:border-brand-400 ${error ? "border-danger" : "border-black/10"}`}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
