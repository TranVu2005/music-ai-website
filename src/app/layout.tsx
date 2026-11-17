import type { Metadata } from "next";
import "./globals.css";
import { AudioPlayerProvider } from "../components/player/AudioPlayerContext";
import { AudioPlayerBar } from "../components/player/AudioPlayerBar";

export const metadata: Metadata = {
  title: "music-shop",
  description: "Specialized e-commerce website for pre-composed music tracks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <AudioPlayerProvider>
          {children}
          <AudioPlayerBar />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
