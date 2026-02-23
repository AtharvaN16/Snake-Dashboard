"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Snake } from "@/lib/types";
import { VenomTypeChip } from "./VenomTypeChip";
import { VenomYieldChip } from "./VenomYieldChip";
import { VenomSpeedChip } from "./VenomSpeedChip";
import { FangTypeChip } from "./FangTypeChip";

// Card content height when expanded. Fixed so translateY never recalculates.
const HANDLE_H = 0;
const CONTENT_H = 650;
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

  return (
    // Anchor: fixed, ~40% wide, centered in viewport
    <div 
      className="fixed bottom-[-40px] left-1/2 z-50 w-[48%] max-w-[560px] min-w-[320px] hover:z-[60] transition-[z-index] delay-300 duration-0 pointer-events-none" 
      style={{ transform: "translateX(-50%)" }}
    >
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ y: 800 }}
        animate={{ y: isExpanded ? 20 : 540 }}
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
            className="grid grid-cols-2 gap-x-12 gap-y-8 transition-opacity duration-300"
          >
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
                    Venom Yield
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

export { VenomPaperCardComponent as VenomPaperCard };
export default VenomPaperCardComponent;
