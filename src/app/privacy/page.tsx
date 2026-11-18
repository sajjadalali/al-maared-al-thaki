import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "الخصوصية",
  description: `شنو يحفظ ${site.name} من بياناتك، ووين، وليش، وشلون تمسحها.`,
};

// What the site really does with data (18 Nov), checked against the code:
// chat logs and leads in Supabase (eu-west-3, Paris), messages to the model
// through OpenRouter, leads to the team on Telegram, the per-visitor rate
// limit in server memory only, and the rest in the browser (lib/interest,
// chatStore, favourites). Change this page when any of that changes.
const SECTIONS: { title: string; body: ReactNode[] }[] = [
  {
    title: "محادثتك ويا سديم",
    body: [
      "رسايلك وردود سديم والسيارات اللي عرضها تنحفظ بقاعدة بيانات الموقع، على سيرفر بفرنسا. نراجعها حتى نصلّح أغلاط سديم ونحسّن ردوده.",
      "حتى يكتب سديم ردّه، رسالتك تنرسل لنموذج ذكاء اصطناعي (Claude من شركة Anthropic، عن طريق خدمة OpenRouter). لا تكتب بالمحادثة شي ما تريد غيرك يقراه، مثل رقم حساب أو كلمة سر.",
    ],
  },
  {
    title: "رقمك واسمك",
    body: [
      "إذا تركت رقمك أو اسمك، بالمحادثة أو باستمارة التواصل، ينحفظون بقاعدة البيانات ويوصل إشعار بيهم لفريق المبيعات على تيليگرام، حتى يتصلون بيك.",
      "ما نستخدمهم لشي غير هذا، وما نبيعهم ولا ننطيهم لأي جهة ثانية.",
    ],
  },
  {
    title: "اللي ينحفظ بمتصفحك بس",
    body: [
      "هذي ما توصل إلنا: محادثاتك حتى ترجعلها، وسياراتك المفضلة، واهتماماتك (السيارات اللي فتحت صفحاتها وشنو فهم سديم من طلبك) حتى قسم سديم بالرئيسية يناسب اللي تدوّره. الاهتمامات تنمسح بروحها بعد 30 يوم.",
      "تگدر تمسحها كلها بأي وقت، من إعدادات متصفحك بمسح بيانات هذا الموقع.",
    ],
  },
  {
    title: "عنوان الإنترنت (IP)",
    body: [
      "نستخدمه حتى نحدد عدد الرسايل لكل زائر، ويبقى بذاكرة السيرفر 10 دقايق بس لهالغرض. ما ينكتب بقاعدة البيانات.",
      "وما نستخدم أدوات تحليل أو إعلانات تتابعك.",
    ],
  },
  {
    title: "تريد نمسح بياناتك؟",
    body: [
      <>
        راسلنا على الواتساب أو اتصل على{" "}
        <bdi dir="ltr" className="whitespace-nowrap">
          {site.phone}
        </bdi>
        ، ونمسح محادثاتك ورقمك من عدنا.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-bold text-brand-950">الخصوصية</h1>
      <p className="mt-4 text-[15px] leading-8 text-neutral-600">
        هنا شنو يحفظ {site.name} من بياناتك، ووين، وليش. آخر تحديث: 18 تشرين الثاني 2026.
      </p>

      <div className="mt-10 space-y-9">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-brand-950">{section.title}</h2>
            {section.body.map((text, i) => (
              <p key={i} className="mt-2.5 text-[15px] leading-8 text-neutral-700">
                {text}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-neutral-500">
        عندك سؤال؟{" "}
        <Link href="/contact" className="font-semibold text-brand-800 underline underline-offset-4">
          تواصل ويانا
        </Link>
      </p>
    </div>
  );
}
