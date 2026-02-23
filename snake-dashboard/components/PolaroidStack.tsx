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
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    // End the "developing" state faster (0.8s)
    const timer = setTimeout(() => setIsFirstLoad(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (images.length === 0) return null;

  const handleShuffle = () => {
    if (images.length <= 1 || isShuffling) return;
    setIsShuffling(true);
    setActiveIndex((prev) => (prev + 1) % images.length);
    // Short reset for shuffle state to allow consecutive clicks
    setTimeout(() => setIsShuffling(false), 300);
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
                  opacity: 0.4 + layer * 0.15,
                  boxShadow: "0 10px 20px rgba(0, 0, 0, 0.12)",
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
          transition={{ duration: 0.3 }}
          className="group absolute h-[90%] w-[92%] cursor-pointer select-none bg-white outline-none"
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
                <Image
                  src={images[activeIndex]}
                  alt={caption}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 420px"
                  priority
                  style={{
                    filter: isFirstLoad 
                      ? "grayscale(60%) brightness(0.3) contrast(0.7) blur(1.5px)" 
                      : "grayscale(0%) brightness(1) contrast(1) blur(0px)",
                    transition: "filter 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
              </motion.div>
            </AnimatePresence>

            {/* Polaroid "Development" Overlay (The milky finish) */}
            {isFirstLoad && (
              <motion.div 
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 bg-[#e0dcd0]/20 mix-blend-overlay pointer-events-none"
              />
            )}

            {/* Attribution Overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black/55 via-black/20 to-transparent opacity-0 transition-opacity duration-250 group-hover:opacity-100 group-focus-within:opacity-100" />
            <div className="absolute inset-x-2 bottom-2 text-[10px] leading-tight text-white/90 opacity-0 transition-opacity duration-250 group-hover:opacity-100 group-focus-within:opacity-100">
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
        </motion.div>

        {/* ANCHORED PIN - Outside the moving card so it stays fixed */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[20]">
           <Image
            src="/images/ui/red-pin.svg"
            alt=""
            width={40}
            height={50}
            className="h-auto w-[36px] -translate-y-[384%]" // Positioned exactly at the rotation origin
            style={{ 
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
              // We use translate-y because it needs to be centered in the parent but pushed up to the origin
            }}
          />
        </div>

      </div>
    </div>
  );
}
