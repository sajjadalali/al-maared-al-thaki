import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { site } from "@/config/site";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
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
      className={`${tajawal.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#101828]">
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
