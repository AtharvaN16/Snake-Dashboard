"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type PolaroidAttribution = {
  photographer?: string;
  source: string;
  license: string;
  sourceUrl?: string;
  licenseUrl?: string;
};

interface PolaroidStackProps {
  images: string[];
  caption: string;
  attributions: PolaroidAttribution[];
}

const BASE_ROTATION = 7;
const PIN_ORIGIN = "50% 6%";

export function PolaroidStack({ images, caption, attributions }: PolaroidStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Trigger shuffle effect on load - significantly slower than normal shuffle
    const timer = setTimeout(() => {
      setIsShuffling(false);
      // Wait slightly longer after animation ends to mark load as complete
      setTimeout(() => setIsInitialLoad(false), 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [images]);

  if (images.length === 0) return null;

  const handleShuffle = () => {
    if (images.length <= 1) return;
    
    setIsShuffling(true);
    const nextIndex = (activeIndex + 1) % images.length;
    setActiveIndex(nextIndex);
    
    setTimeout(() => {
      setIsShuffling(false);
    }, 300);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleShuffle();
    }
  };

  const stackImages = [1, 2, 3].map((offset) => {
    const idx = (activeIndex + offset) % images.length;
    return { id: idx };
  });

  return (
    <div className="relative z-10 aspect-[10/9] w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        
        {/* Static Background Stack */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {stackImages.slice(0, Math.min(3, images.length - 1)).reverse().map((item, i) => {
            const layer = 2 - i;
            return (
              <div
                key={`bg-stack-${item.id}`}
                className="absolute h-[88%] w-[90%] bg-white"
                style={{
                  transformOrigin: PIN_ORIGIN,
                  transform: `translate(${10 + layer * 9}px, ${18 + layer * 11}px) rotate(${BASE_ROTATION - 1.25 + layer * 0.7}deg) scale(${0.98 + layer * 0.01})`,
                  boxShadow: `0 ${4 + layer * 4}px ${12 + layer * 6}px rgba(0, 0, 0, ${0.08 + layer * 0.04}), 0 2px 4px rgba(0, 0, 0, 0.06)`,
                  zIndex: 1 + layer,
                }}
              >
                <div className="h-full w-full bg-stone-100" />
              </div>
            );
          })}
        </div>

        {/* Active Polaroid Card Container */}
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Shuffle snake photo"
          onClick={handleShuffle}
          onKeyDown={handleKeyDown}
          animate={{ 
            rotate: isShuffling ? [BASE_ROTATION, BASE_ROTATION - 1, BASE_ROTATION + 1, BASE_ROTATION] : BASE_ROTATION,
            scale: isShuffling ? [1, 0.98, 1.01, 1] : 1
          }}
          whileHover={{ rotate: BASE_ROTATION - 2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ 
            duration: isInitialLoad ? 2.0 : 0.3,
            ease: "easeInOut"
          }}
          className="group absolute h-[90%] w-[92%] cursor-pointer select-none bg-white outline-none focus-visible:ring-2 focus-visible:ring-stone-600 focus-visible:ring-offset-2 rounded-none"
          style={{
            transformOrigin: PIN_ORIGIN,
            padding: "5% 4.5% 18% 4.5%",
            boxShadow: "0 14px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)",
            zIndex: 10,
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden bg-stone-200"
            style={{ boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.06)" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[activeIndex]}
                  alt={caption}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Attribution Overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black/55 via-black/20 to-transparent opacity-100 transition-opacity duration-250 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" />
            <div className="absolute inset-x-2 bottom-2 text-[10px] leading-tight text-white/90 opacity-100 transition-opacity duration-250 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <span className="pointer-events-none">Photo: {attributions[activeIndex]?.photographer || "Unknown"} </span>
              <span className="pointer-events-none">· Source: </span>
              {attributions[activeIndex]?.sourceUrl ? (
                <a
                  href={attributions[activeIndex].sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="pointer-events-auto underline hover:text-white"
                >
                  {attributions[activeIndex].source}
                </a>
              ) : (
                <span className="pointer-events-none">{attributions[activeIndex]?.source}</span>
              )}
              <span className="pointer-events-none"> · License: </span>
              {attributions[activeIndex]?.licenseUrl ? (
                <a
                  href={attributions[activeIndex].licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="pointer-events-auto underline hover:text-white"
                >
                  {attributions[activeIndex].license}
                </a>
              ) : (
                <span className="pointer-events-none">{attributions[activeIndex]?.license}</span>
              )}
            </div>
          </div>

          <p
            className="pointer-events-none absolute left-1/2 top-[84.8%] -translate-x-1/2 -translate-y-1/2 text-center italic text-black/80"
            style={{ fontSize: "clamp(11px, 1.1vw, 16px)", lineHeight: 1 }}
          >
            {caption}
          </p>

          <div className="absolute left-[6%] bottom-[5%] flex gap-2 md:hidden">
            {images.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleShuffle();
                }}
                className="pointer-events-auto rounded border border-black/20 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-tight text-black/75"
              >
                Next
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="absolute right-[6%] bottom-[5%] hidden text-[10px] text-black/40 opacity-0 transition-opacity duration-200 pointer-events-none uppercase tracking-tight font-medium md:block group-hover:opacity-100">
              Click to shuffle ({activeIndex + 1}/{images.length})
            </div>
          )}
        </motion.div>

        {/* ANCHORED PIN - Outside the moving card so it stays fixed */}
        <div className="pointer-events-none absolute left-1/2 top-[3.8%] z-[20] -translate-x-1/2 md:top-[6%]">
           <Image
            src="/images/ui/red-pin.svg"
            alt=""
            width={40}
            height={50}
            className="h-auto w-[36px]"
            style={{ 
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
            }}
          />
        </div>

      </div>
    </div>
  );
}
