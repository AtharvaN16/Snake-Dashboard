"use client";

import Link from "next/link";
import { HomeSearchCard } from "@/components/HomeSearchCard";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-background py-8 px-[68px] relative">
      {/* Top right: keyboard shortcut labels */}
      <nav className="absolute top-8 right-[68px] flex items-center gap-4 flex-wrap text-sm text-stone-600 shrink-0">
        <span className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            R
          </kbd>
          <Link
            href="/rank"
            className="hover:text-stone-800 transition-colors no-underline"
          >
            Rankings
          </Link>
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            T
          </kbd>
          <Link
            href="/phylogeny"
            className="hover:text-stone-800 transition-colors no-underline"
          >
            Taxonomy
          </Link>
        </span>
      </nav>

      <div className="h-full max-w-2xl mx-auto flex flex-col">
        {/* Header with Icon and Title */}
        <div className="text-center mb-5 shrink-0">
          <div className="flex justify-center mb-3">
            <div className="text-6xl">🐍</div>
          </div>
          <h1 className="text-[2.75rem] font-serif font-normal text-[#2c2c2c] leading-tight">
            Is It Venomous?
          </h1>
        </div>

        <HomeSearchCard inputId="main-search" />

        {/* Footer Attribution */}
        <div className="text-center mt-5 text-sm text-stone-600 shrink-0">
          <p>
            Researched 🔬 by{" "}
            <a 
              href="https://github.com" 
              className="hover:text-stone-900 transition-colors no-underline"
            >
              Atharva
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
