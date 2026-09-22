import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
