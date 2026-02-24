"use client";

import { useState, useMemo, memo } from "react";
import { motion } from "framer-motion";
import type { Snake, ClinicalData } from "@/lib/types";

type SymptomsMap = NonNullable<Snake["symptoms"]>;

interface ClinicalSymptomsCardProps {
  symptoms: SymptomsMap;
  causesOfDeath?: string[];
  clinicalData?: ClinicalData;
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

const ClinicalSymptomsCardComponent = memo(function ClinicalSymptomsCard({ symptoms, causesOfDeath, clinicalData }: ClinicalSymptomsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sections = useMemo(() => {
    type Section = { label: string; values: string[] };
    const items: Section[] = [];

    for (const [key, list] of Object.entries(symptoms)) {
      if (!Array.isArray(list) || list.length === 0 || (list.length === 1 && list[0] === "N/A")) continue;
      const label = KEY_LABELS[key] ?? key.replace(/([A-Z])/g, " $1");
      items.push({ label, values: list });
    }
    if (causesOfDeath && causesOfDeath.length > 0) {
      items.push({ label: "Causes of Death", values: causesOfDeath });
    }
    return items;
  }, [symptoms, causesOfDeath]);

  if (sections.length === 0 && !clinicalData) return null;

  return (
    <div
      className="fixed bottom-[-40px] left-[68px] z-40 w-[45%] max-w-[520px] min-w-[300px] hover:z-[60] transition-[z-index] delay-300 duration-0 pointer-events-none"
    >
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ y: 800 }}
        animate={{ y: isExpanded ? 80 : 710 }}
        whileHover={{ 
          y: isExpanded ? 80 : 700,
          transition: { delay: 0.3, duration: 0.2, ease: "easeOut" }
        }}
        transition={{ ease: EASE, duration: 0.6 }}
        className="relative flex flex-col cursor-pointer select-none will-change-transform pointer-events-auto"
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
          className="relative z-10 flex-1 px-12 pt-10 pb-32"
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

          <motion.div 
            animate={{ opacity: isExpanded ? 1 : 0.4 }}
            className="transition-opacity duration-300"
          >
            {/* Clinical Severity Header */}
            {clinicalData && (
              <div className="mb-10 border-b-2 border-dashed border-stone-300 pb-8">
                <div className="flex flex-col items-center gap-2 mb-6">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Severity Level</span>
                  <span 
                    className="px-3 py-1 rounded text-sm font-black uppercase tracking-widest"
                    style={{ 
                      backgroundColor: 
                        clinicalData.severity === "Life-threatening" ? "#FEE2E2" : 
                        clinicalData.severity === "Severe" ? "#FFEDD5" : "#FEF9C3",
                      color: 
                        clinicalData.severity === "Life-threatening" ? "#991B1B" : 
                        clinicalData.severity === "Severe" ? "#9A3412" : "#854D0E"
                    }}
                  >
                    {clinicalData.severity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Fatality (Untreated)</div>
                    <div className="text-xl font-bold text-stone-800 tabular-nums">
                      {clinicalData.untreatedFatalityRate.low}–{clinicalData.untreatedFatalityRate.high}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">WHO Importance</div>
                    <div className="text-xl font-bold text-stone-800 uppercase">
                      {clinicalData.whoCategory ? `Category ${clinicalData.whoCategory}` : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-6">
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
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

export { ClinicalSymptomsCardComponent as ClinicalSymptomsCard };
export default ClinicalSymptomsCardComponent;
