"use client";

import Link from "next/link";
import { HomeSearchCard } from "@/components/HomeSearchCard";
import { Kbd } from "@/components/ui/kbd";
import { SnakeGame } from "@/components/SnakeGame";
import { useState } from "react";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative min-h-screen px-2 pb-5 pt-4 sm:px-4 sm:pb-6 sm:pt-5 lg:px-[68px] lg:py-8 overflow-hidden">
      {/* Desktop Logo - Top Left */}
      <div className="hidden lg:block absolute left-[68px] top-8 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-800 rounded flex items-center justify-center text-white font-bold text-xl">🐍</div>
          <span className="font-serif text-lg font-bold text-[#2c2c2c] tracking-tight">VNM</span>
        </div>
      </div>

      {/* Nav links */}
      {!isPlaying && (
        <nav className="mx-auto mb-3 flex w-fit items-center gap-3 text-xs font-medium text-stone-600 sm:text-sm lg:absolute lg:right-[68px] lg:top-8 lg:mb-0 lg:gap-4 z-10">
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
      )}

      <div className="mx-auto flex max-w-2xl flex-col">
        {/* Header/Game Section */}
        <div className={`shrink-0 text-center ${isPlaying ? "" : "mb-4 mt-2 lg:mt-2"}`}>
          {/* Mobile Header (SNAKES Dot Matrix) */}
          {!isPlaying && (
            <div className="lg:hidden flex flex-col items-center gap-4 py-4">
              <SnakeGame isStatic />
              <h1 className="text-[2.25rem] font-serif font-normal leading-tight text-[#2c2c2c]">
                Is It Venomous?
              </h1>
            </div>
          )}

          {/* Desktop Snake Game (Hidden on Mobile) */}
          <div className="hidden lg:block">
            <SnakeGame 
              forcedPlaying={isPlaying}
              onGameStart={() => setIsPlaying(true)} 
              onGameOver={() => setIsPlaying(false)}
              onExit={() => setIsPlaying(false)}
            />
          </div>
        </div>

        {/* Search Card - Pushed down by 20px (lg:mt-5) and hidden when playing */}
        {!isPlaying && (
          <div className="lg:mt-5">
            <HomeSearchCard
              inputId="main-search"
              className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col w-full max-h-[70vh]"
            />
          </div>
        )}

        {/* Footer Attribution - Fixed 12px from bottom */}
        {!isPlaying && (
          <div className="fixed bottom-[12px] left-0 right-0 text-center text-xs text-stone-600 sm:text-sm z-10 pointer-events-none">
            <p className="pointer-events-auto">
              Researched 🔬 by{" "}
              <a 
                href="https://github.com" 
                className="hover:text-stone-900 transition-colors no-underline font-medium"
              >
                Atharva
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
