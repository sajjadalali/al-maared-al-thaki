"use client";

import { useEffect } from "react";
import { reportCaughtError } from "@/lib/errorReporter";
import { site } from "@/config/site";

// The root layout itself failed: this page has no header, styles or fonts of
// the site, so it carries its own few styles (18 Nov). Arabic, right to left.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    reportCaughtError("global-error", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif", background: "#f5f6f8", color: "#0b1322" }}>
        <title>{`صار خلل، ${site.name}`}</title>
        <main style={{ maxWidth: 420, margin: "0 auto", padding: "96px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>ما گدرنا نفتح الموقع</h1>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: "#525866", margin: "12px 0 24px" }}>
            صار خلل من عدنا، مو منك. جرّب مرة ثانية بعد شوية.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ font: "inherit", fontWeight: 700, fontSize: 15, color: "#fff", background: "#142036", border: 0, borderRadius: 12, padding: "11px 22px", cursor: "pointer" }}
          >
            جرّب مرة ثانية
          </button>
        </main>
      </body>
    </html>
  );
}
