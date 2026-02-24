"use client";

import Link from "next/link";
import { HomeSearchCard } from "@/components/HomeSearchCard";
import { Kbd } from "@/components/ui/kbd";
import { SnakeGame } from "@/components/SnakeGame";
import { PaperAppBackground } from "@/components/PaperAppBackground";
import { useState, useEffect } from "react";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);

  // Strictly disable scrolling on the body for the home page
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  return (
    <div className="relative h-dvh w-full px-2 sm:px-4 lg:px-[68px] overflow-hidden">
      <PaperAppBackground />
      
      {/* Desktop Easter Egg Logo - Top Left */}
      <div className="hidden lg:block absolute left-[68px] top-8 z-20">
        <SnakeGame 
          forcedPlaying={isPlaying}
          onGameStart={() => setIsPlaying(true)} 
          onGameOver={() => setIsPlaying(false)}
          onExit={() => setIsPlaying(false)}
          className="!w-16 !h-16 shadow-lg hover:shadow-xl transition-shadow border-2 border-stone-300/20"
        />
      </div>

      {/* Nav links - Absolute positioned to stay within viewport without flow issues */}
      {!isPlaying && (
        <nav className="absolute top-6 left-0 right-0 mx-auto z-20 flex w-fit items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-stone-500 sm:text-xs lg:left-auto lg:right-[68px] lg:top-8 lg:mx-0 lg:gap-4 lg:text-sm lg:font-medium lg:normal-case lg:tracking-normal lg:text-stone-600">
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

      {/* Main Content Area - Center aligned relative to viewport */}
      <div className="relative flex flex-col h-full w-full items-center justify-center z-10 pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto">
          {/* Mobile Header (SNAKES Dot Matrix) */}
          {!isPlaying && (
            <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
              <SnakeGame isStatic className="!w-24 !h-24" />
            </div>
          )}

          {/* Search Card - Centered exactly in the viewport with a slight translate-y on desktop */}
          {!isPlaying && (
            <div className="lg:translate-y-16">
              <HomeSearchCard
                inputId="main-search"
                className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col w-full max-h-[70vh]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Attribution - Desktop Only, Fixed 12px from bottom */}
      {!isPlaying && (
        <div className="fixed bottom-[12px] left-0 right-0 text-center text-xs text-stone-600 z-10 pointer-events-none hidden lg:block">
          <p className="pointer-events-auto">
            Created by{" "}
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
  );
}
