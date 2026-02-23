"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Snake } from "@/lib/types";

type SymptomsMap = NonNullable<Snake["symptoms"]>;

interface ClinicalSymptomsCardProps {
  symptoms: SymptomsMap;
  causesOfDeath?: string[];
}

const KEY_LABELS: Record<string, string> = {
  localEffects: "Local Effects",
  neurological: "Neurological",
  blood: "Blood",
  muscle: "Muscle",
  gastrointestinal: "Gastrointestinal",
};

const CONTENT_H = 850;
const CARD_H = CONTENT_H;
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";
const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";

export function ClinicalSymptomsCard({ symptoms, causesOfDeath }: ClinicalSymptomsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  type Section = { label: string; values: string[] };
  const sections: Section[] = [];

  for (const [key, list] of Object.entries(symptoms)) {
    if (!Array.isArray(list) || list.length === 0 || (list.length === 1 && list[0] === "N/A")) continue;
    const label = KEY_LABELS[key] ?? key.replace(/([A-Z])/g, " $1");
    sections.push({ label, values: list });
  }
  if (causesOfDeath && causesOfDeath.length > 0) {
    sections.push({ label: "Causes of Death", values: causesOfDeath });
  }

  if (sections.length === 0) return null;

  return (
    <div
      className="fixed bottom-[-40px] left-[68px] z-40 w-[45%] max-w-[520px] min-w-[300px] hover:z-[60] transition-all duration-300"
    >
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ y: 800 }}
        animate={{ y: isExpanded ? 100 : 680 }}
        transition={{ ease: EASE, duration: 0.6 }}
        className="relative flex flex-col cursor-pointer select-none"
        style={{ height: CARD_H }}
      >
        {/* Receipt paper background */}
        <div
          aria-hidden
          className="absolute pointer-events-none select-none"
          style={{
            top: -48,
            left: -48,
            right: -48,
            bottom: -200,
            backgroundImage: "url('/paper/receipt-no-title.png')",
            backgroundSize: "100% auto",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(0 -20px 50px rgba(0,0,0,0.22))",
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 flex-1 px-10 pt-10 pb-32 overflow-hidden"
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
            Clinical Symptoms
          </h2>

          {/* Sections */}
          <motion.div 
            animate={{ opacity: isExpanded ? 1 : 0.4 }}
            className="space-y-6 transition-opacity duration-300"
          >
            {sections.map((section, i) => (
              <div key={i} className="flex flex-col gap-1">
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
                  {section.label}
                </span>
                <p
                  style={{
                    fontFamily: COMPACT,
                    fontWeight: 400,
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#555",
                    lineHeight: "1.4",
                  }}
                >
                  {section.values.join(", ")}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
