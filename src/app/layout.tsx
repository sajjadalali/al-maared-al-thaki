import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { site } from "@/config/site";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  subsets: ["arabic", "latin"],
  // Only the weights the UI uses (font-normal, font-semibold, font-bold). Each
  // weight is two preloaded files (Arabic + Latin), so every extra one slows the
  // first paint; prefer these three over adding another.
  weight: ["400", "600", "700"],
  display: "swap",
});

const description = `${site.name} — تصفح السيارات الجديدة والمستعملة في العراق، قارن الأسعار، واحصل على مساعدة فورية من سديم، مساعد المبيعات الذكي.`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | بيع وشراء السيارات في العراق`,
    template: `%s | ${site.name}`,
  },
  description,
  openGraph: {
    type: "website",
    locale: "ar_IQ",
    siteName: site.name,
    title: `${site.name} | بيع وشراء السيارات في العراق`,
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
