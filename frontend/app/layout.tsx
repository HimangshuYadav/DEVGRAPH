import type { Metadata } from "next";
import { Special_Elite, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-special-elite",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEVGRAPH — Card Catalog",
  description:
    "Documentation index catalog & cross-reference web for developer docs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${specialElite.variable} ${sourceSerif.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-[#2A1F1A] text-[#EFE3C8] font-serif antialiased selection:bg-[#B08D57]/30 selection:text-[#EFE3C8]">
        {children}
      </body>
    </html>
  );
}
