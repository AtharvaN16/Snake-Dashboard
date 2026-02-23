"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SymptomChipProps {
  symptom: string;
  className?: string;
  index?: number; // Optional index for staggered animation
}

const pillStyle = {
  backgroundColor: "#E5E5E5",
  color: "#000",
};

const chipVariants = {
  hidden: { opacity: 0, x: -8, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: i * 0.04, // Staggered delay based on index
      duration: 0.4,
      ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
    },
  }),
};

export function SymptomChip({ symptom, className, index = 0 }: SymptomChipProps) {
  return (
    <motion.span
      custom={index}
      initial="hidden"
      animate="visible"
      variants={chipVariants}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        className
      )}
      style={pillStyle}
    >
      <span>{symptom}</span>
    </motion.span>
  );
}
