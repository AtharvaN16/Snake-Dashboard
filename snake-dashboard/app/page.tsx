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
    <div className="relative h-dvh w-full px-0 md:px-4 lg:px-[68px] overflow-hidden">
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

      {/* Nav links - Desktop: absolute; Mobile: in flow above logo with gap */}
      {!isPlaying && (
        <nav className="hidden lg:flex absolute left-auto right-[68px] top-8 z-20 mx-0 w-fit items-center gap-4 text-sm font-medium normal-case tracking-normal text-stone-600">
            <span className="flex items-center gap-2">
              <Kbd triggerKey="R" className="inline-flex">R</Kbd>
              <Link
                href="/rank"
                className="hover:text-stone-800 transition-colors no-underline"
              >
                Rankings
              </Link>
            </span>
            <span className="flex items-center gap-2">
              <Kbd triggerKey="T" className="inline-flex">T</Kbd>
              <Link
                href="/phylogeny"
                className="hover:text-stone-800 transition-colors no-underline"
              >
                Taxonomy
              </Link>
            </span>
          </nav>
      )}

      {/* Main Content Area - Mobile: top band (links + logo with gap) + bottom 70% (search); Desktop: centered */}
      <div className="relative flex flex-col h-full w-full items-center justify-center z-10 pointer-events-none lg:justify-center">
        <div className="flex flex-col h-full w-full max-w-2xl pointer-events-auto lg:h-auto lg:justify-center">
          {/* Mobile: top section - links, vertical gap, then logo */}
          {!isPlaying && (
            <div className="lg:hidden flex shrink-0 flex-col items-center gap-6 pt-4 pb-3 sm:pt-5 sm:pb-4">
              <nav className="flex w-fit items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-stone-500 sm:text-xs">
                <Link
                  href="/rank"
                  className="hover:text-stone-800 transition-colors no-underline"
                >
                  Rankings
                </Link>
                <Link
                  href="/phylogeny"
                  className="hover:text-stone-800 transition-colors no-underline"
                >
                  Taxonomy
                </Link>
              </nav>
              <SnakeGame isStatic className="!w-24 !h-24 my-5 sm:my-6" />
            </div>
          )}

          {/* Search Card - Mobile: fixed 70vh at bottom; Desktop: fixed 70vh height, list scrolls inside */}
          {!isPlaying && (
            <div className="mt-auto flex h-[70vh] min-h-[70vh] w-full shrink-0 flex-col lg:mt-0 lg:h-[70vh] lg:min-h-0 lg:translate-y-16 lg:w-full">
              <HomeSearchCard
                inputId="main-search"
                className="bg-white rounded-t-2xl shadow-md overflow-hidden flex flex-col w-full h-full min-h-0 max-h-[70vh] lg:rounded-2xl lg:min-h-0 lg:h-full"
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
