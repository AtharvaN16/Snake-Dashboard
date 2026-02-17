import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { SearchModal } from "@/components/SearchModal";
import { SearchModalProvider } from "@/contexts/SearchModalContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SearchModalProvider>
          <KeyboardShortcuts />
          <SearchModal />
          {children}
        </SearchModalProvider>
      </body>
    </html>
  );
}
