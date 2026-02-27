import type { Metadata } from "next";
import localFont from "next/font/local";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PaperAppBackground } from "@/components/PaperAppBackground";
import { SearchModal } from "@/components/SearchModal";
import { SearchModalProvider } from "@/contexts/SearchModalContext";
import { getSnakeSummaries } from "@/lib/snakeData";
import "./globals.css";

const pangramSans = localFont({
  src: [
    { path: "../fonts/pangram-sans/PPPangramSans-Thin.otf", weight: "100", style: "normal" },
    { path: "../fonts/pangram-sans/PPPangramSans-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/pangram-sans/PPPangramSans-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/pangram-sans/PPPangramSans-Semibold.otf", weight: "600", style: "normal" },
    { path: "../fonts/pangram-sans/PPPangramSans-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/pangram-sans/PPPangramSans-ExtraboldItalic.otf", weight: "800", style: "italic" },
  ],
  variable: "--font-pangram-sans",
});

const pangramCompressed = localFont({
  src: [{ path: "../fonts/pangram-sans/PPPangramSans-CompressedExtrabold.otf", weight: "800", style: "normal" }],
  variable: "--font-pangram-compressed",
});

const pangramSlim = localFont({
  src: [{ path: "../fonts/pangram-sans/PPPangramSans-SlimSemiboldItalic.otf", weight: "600", style: "italic" }],
  variable: "--font-pangram-slim",
});

const pangramCompact = localFont({
  src: [{ path: "../fonts/pangram-sans/PPPangramSans-CompactRegular.otf", weight: "400", style: "normal" }],
  variable: "--font-pangram-compact",
});

export const metadata: Metadata = {
  title: "Is It Venomous? - Venomous Snake Database",
  description: "Comprehensive database of the world's most dangerous venomous snakes, with detailed information on venom types, danger scores, and medical data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snakes = getSnakeSummaries();
  return (
    <html lang="en">
      <body className={`${pangramSans.variable} ${pangramCompressed.variable} ${pangramSlim.variable} ${pangramCompact.variable} relative font-sans antialiased`}>
        <PaperAppBackground />
        <SearchModalProvider>
          <div className="relative z-10">
            <KeyboardShortcuts />
            <SearchModal snakes={snakes} />
            {children}
          </div>
        </SearchModalProvider>
      </body>
    </html>
  );
}
