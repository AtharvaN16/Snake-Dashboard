"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PaperCardProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function PaperCard({ children, isActive, className }: PaperCardProps) {
  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={isActive ? { x: 0, opacity: 1 } : { x: "100%", opacity: 0 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 30,
        mass: 0.8
      }}
      className={cn(
        "absolute inset-y-0 right-0 w-[85%] max-w-[900px] h-full z-30",
        "bg-[#fdfbf7] shadow-[-10px_0_30px_rgba(0,0,0,0.1)]",
        className
      )}
      style={{
        // Paper texture effect
        backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
        borderLeft: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      {/* Subtle paper grain overlay using SVG filter */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ filter: "url(#noiseFilter)" }} />
      
      <div className="relative h-full overflow-y-auto overflow-x-hidden p-12 scrollbar-hide">
        {children}
      </div>

      <svg className="absolute w-0 h-0">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
      </svg>
    </motion.div>
  );
}
