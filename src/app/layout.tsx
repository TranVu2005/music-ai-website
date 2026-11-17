import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "../components/player/AudioPlayerContext";
import { AudioPlayerBar } from "../components/player/AudioPlayerBar";
import { Header } from "../components/common/Header";
import { Footer } from "../components/common/Footer";
import { FloatingContact } from "../components/common/FloatingContact";
import { vi } from "../lib/i18n/vi";

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const display = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: `${vi.brand.name} – ${vi.meta.home.title}`,
  description: vi.meta.home.description,
  openGraph: {
    siteName: vi.brand.name,
    locale: vi.meta.ogLocale,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body className="antialiased">
        <a
          href="#noi-dung"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2"
        >
          {vi.common.skipLink}
        </a>
        <AudioPlayerProvider>
          <Header />
          {children}
          <Footer />
          <AudioPlayerBar />
          <FloatingContact />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
