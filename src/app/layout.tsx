import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { site } from "@/config/site";
import { ERROR_REPORTER } from "@/lib/errorReporter";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  // `subsets` is what gets preloaded: the Arabic files only (15 Nov). The Latin
  // ones (digits, «SUV», model names) are still in the CSS and load when a
  // page uses them, without competing with the first paint.
  subsets: ["arabic"],
  // Only the weights the UI uses (font-normal, font-semibold, font-bold); every
  // extra one is another preloaded file. Prefer these three over adding another.
  weight: ["400", "600", "700"],
  display: "swap",
});

// Pages show the stock from Supabase; refresh them at least this often (seconds,
// same as CATALOG_REVALIDATE in src/server/catalog.ts).
export const revalidate = 60;

const description = `${site.name}: سيارات جديدة ومستعملة ب${site.city} بأسعار معلنة بالدينار. ويانا سديم، مساعدك الشخصي لشراء سيارتك: تحچي وياه بكلامك، يجيبلك اللي يناسبك ويقارنلك بيناتهن.`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | سيارات جديدة ومستعملة ببغداد`,
    template: `%s | ${site.name}`,
  },
  description,
  openGraph: {
    type: "website",
    locale: "ar_IQ",
    siteName: site.name,
    title: `${site.name} | سيارات جديدة ومستعملة ببغداد`,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plex.variable} h-full antialiased`}
    >
      <head>
        {/* Reports load and script errors to the server (src/lib/errorReporter.ts).
            Inline, so it runs even when the site's own JavaScript or CSS does not. */}
        <script dangerouslySetInnerHTML={{ __html: ERROR_REPORTER }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#0f172a]">
        <FavoritesProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </FavoritesProvider>
      </body>
    </html>
  );
}
