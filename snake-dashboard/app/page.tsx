"use client";

import Link from "next/link";
import { HomeSearchCard } from "@/components/HomeSearchCard";
import { Kbd } from "@/components/ui/kbd";

export default function Home() {
  return (
    <div className="relative min-h-screen px-2 pb-5 pt-4 sm:px-4 sm:pb-6 sm:pt-5 lg:px-[68px] lg:py-8">
      {/* Nav links */}
      <nav className="mx-auto mb-3 flex w-fit items-center gap-3 text-[10px] text-stone-600 sm:text-sm lg:absolute lg:right-[68px] lg:top-8 lg:mb-0 lg:gap-4">
        <span className="flex items-center gap-2">
          <Kbd triggerKey="R" className="hidden lg:inline-flex">R</Kbd>
          <Link
            href="/rank"
            className="hover:text-stone-800 transition-colors no-underline"
          >
            Rankings
          </Link>
        </span>
        <span className="flex items-center gap-2">
          <Kbd triggerKey="T" className="hidden lg:inline-flex">T</Kbd>
          <Link
            href="/phylogeny"
            className="hover:text-stone-800 transition-colors no-underline"
          >
            Taxonomy
          </Link>
        </span>
      </nav>

      <div className="mx-auto flex max-w-2xl flex-col">
        {/* Header with Icon and Title */}
        <div className="mb-4 shrink-0 text-center sm:mb-5">
          <div className="mb-2 flex justify-center sm:mb-3">
            <div className="text-5xl sm:text-6xl">🐍</div>
          </div>
          <h1 className="mx-auto max-w-[9ch] text-[2.2rem] font-serif font-normal leading-[1.04] text-[#2c2c2c] sm:max-w-none sm:text-[2.75rem]">
            Is It Venomous?
          </h1>
        </div>

        <HomeSearchCard
          inputId="main-search"
          className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col w-full"
        />

        {/* Footer Attribution */}
        <div className="mt-4 shrink-0 text-center text-xs text-stone-600 sm:mt-5 sm:text-sm">
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
