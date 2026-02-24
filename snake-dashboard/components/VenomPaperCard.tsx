"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Snake } from "@/lib/types";
import { VenomTypeChip } from "./VenomTypeChip";
import { VenomYieldChip } from "./VenomYieldChip";
import { VenomSpeedChip } from "./VenomSpeedChip";
import { FangTypeChip } from "./FangTypeChip";
import { calculateLethalDosesRaw } from "@/lib/dangerScore";

// Card content height when expanded.
const CONTENT_H = 720;
const CARD_H = CONTENT_H;

// Smooth ease-out — intentional, no overshoot
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";
const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";

interface VenomPaperCardProps {
  snake: Snake;
}

const VenomPaperCardComponent = memo(function VenomPaperCard({ snake }: VenomPaperCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (snake.venomClassification === "Non-venomous") return null;

  const rawLethalDoses = snake.venomPotency?.ld50Normalized && snake.venomYield?.dryWeight
    ? calculateLethalDosesRaw(snake.venomPotency.ld50Normalized, snake.venomYield.dryWeight)
    : 0;

  return (
    // Anchor: fixed, ~40% wide, centered in viewport
    <div 
      className="fixed bottom-[-40px] left-1/2 z-50 w-[48%] max-w-[560px] min-w-[320px] hover:z-[60] transition-[z-index] delay-300 duration-0 pointer-events-none" 
      style={{ transform: "translateX(-50%)" }}
    >
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ y: 800 }}
        animate={{ y: isExpanded ? 40 : 600 }}
        whileHover={{ 
          y: isExpanded ? 30 : 590,
          transition: { delay: 0.3, duration: 0.2, ease: "easeOut" }
        }}
        transition={{ ease: EASE, duration: 0.6 }}
        className="relative flex flex-col cursor-pointer select-none will-change-transform pointer-events-auto"
        style={{ height: CARD_H }}
      >
        {/* Paper background */}
        <div
          aria-hidden
          className="absolute pointer-events-none select-none"
          style={{
            top: -48,
            left: -48,
            right: -48,
            bottom: -200,
            backgroundImage: "url('/paper/paper-50.svg')",
            backgroundSize: "100% auto",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(0 -20px 50px rgba(0,0,0,0.22))",
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 flex-1 px-10 pt-10 pb-32"
        >
          {/* Title */}
          <h2
            className="mb-8 text-center"
            style={{
              fontFamily: COMPRESSED,
              fontWeight: 800,
              fontSize: "36px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#2c2c2c",
              lineHeight: 1,
            }}
          >
            Venom Profile
          </h2>

          <motion.div
            animate={{ opacity: isExpanded ? 1 : 0.4 }}
            className="space-y-10 transition-opacity duration-300"
          >
            {/* Top row: Lethality Breakdown */}
            <div className="border-b border-stone-200 pb-8">
              <div className="flex items-baseline justify-between mb-6">
                <span
                  style={{
                    fontFamily: COMPRESSED,
                    fontWeight: 800,
                    fontSize: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#2c2c2c",
                  }}
                >
                  Lethality Breakdown
                </span>
                {rawLethalDoses > 0 && (
                   <span className="text-xl font-bold text-red-600 font-pangram-compressed tracking-wider">
                     ~{rawLethalDoses.toFixed(1)} lethal doses per bite
                   </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Potency (SC Equivalent)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-stone-800">{snake.venomPotency?.ld50Normalized?.toFixed(3) ?? "N/A"}</span>
                    <span className="text-xs font-medium text-stone-500">mg/kg LD50</span>
                    {snake.dangerScoreComponents && (
                      <span className="ml-auto text-xs font-bold text-stone-400">Score: {snake.dangerScoreComponents.potencyScore}/100</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Max Dry Yield</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-stone-800">{snake.venomYield?.dryWeight ?? "N/A"}</span>
                    <span className="text-xs font-medium text-stone-500">mg dry</span>
                    {snake.dangerScoreComponents && (
                      <span className="ml-auto text-xs font-bold text-stone-400">Score: {snake.dangerScoreComponents.yieldScore}/100</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              {/* Left: Type */}
              <div className="space-y-8">
                <div className="flex flex-col gap-1">
                  <span
                    style={{
                      fontFamily: COMPRESSED,
                      fontWeight: 800,
                      fontSize: "20px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#2c2c2c",
                    }}
                  >
                    Type
                  </span>
                  <div className="flex flex-wrap gap-x-2 pt-1">
                    {snake.venomTypes?.map((type, i) => (
                      <span key={type} className="flex items-center">
                        <VenomTypeChip type={type} />
                        {i < (snake.venomTypes?.length ?? 0) - 1 && (
                          <span className="text-stone-400 ml-1">,</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {snake.venomYield && (
                  <div className="flex flex-col gap-1">
                    <span
                      style={{
                        fontFamily: COMPRESSED,
                        fontWeight: 800,
                        fontSize: "20px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#2c2c2c",
                      }}
                    >
                      Intensity
                    </span>
                    <div className="pt-1">
                      <VenomYieldChip yield={snake.venomYield} />
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Delivery */}
              <div className="space-y-8">
                {snake.venomSpeed && (
                  <div className="flex flex-col gap-1">
                    <span
                      style={{
                        fontFamily: COMPRESSED,
                        fontWeight: 800,
                        fontSize: "20px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#2c2c2c",
                      }}
                    >
                      Speed
                    </span>
                    <div className="pt-1">
                      <VenomSpeedChip speed={snake.venomSpeed} />
                    </div>
                  </div>
                )}

                {snake.fangType && (
                  <div className="flex flex-col gap-1">
                    <span
                      style={{
                        fontFamily: COMPRESSED,
                        fontWeight: 800,
                        fontSize: "20px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#2c2c2c",
                      }}
                    >
                      Delivery Method
                    </span>
                    <div className="pt-1 flex items-center gap-4 relative">
                      <FangTypeChip 
                        fangType={snake.fangType} 
                        venomousClassification={snake.venomClassification}
                        className="relative z-10"
                      />
                      {/* Fang sticker image - positioned relatively to sit after the chip */}
                      <motion.img
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        src={`/images/anatomy/${
                          snake.fangType === "Hinged front fangs" || snake.fangType === "Movable front fangs"
                            ? "hinged front fangs.png"
                            : snake.fangType === "Fixed front fangs"
                            ? "fixed front fangs.png"
                            : "rear fanged.png"
                        }`}
                        alt=""
                        aria-hidden
                        className="h-16 w-auto flex-none z-20"
                        style={{ 
                          filter: `
                            drop-shadow(2px 0 0 #fff) 
                            drop-shadow(-2px 0 0 #fff) 
                            drop-shadow(0 2px 0 #fff) 
                            drop-shadow(0 -2px 0 #fff)
                            drop-shadow(1px 1px 0 #fff)
                            drop-shadow(-1px -1px 0 #fff)
                            drop-shadow(1px -1px 0 #fff)
                            drop-shadow(-1px 1px 0 #fff)
                          `,
                          transform: "rotate(8deg) translateX(10px)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

export { VenomPaperCardComponent as VenomPaperCard };
export default VenomPaperCardComponent;
