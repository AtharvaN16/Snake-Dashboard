"use client";

import { useState, useMemo, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type { Snake, ClinicalData } from "@/lib/types";
import { calculateClinicalScore } from "@/lib/dangerScore";
import { ScoreTooltip, type TooltipRow } from "./ScoreTooltip";

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

const ClinicalSymptomsCardComponent = memo(function ClinicalSymptomsCard({
  symptoms,
  causesOfDeath,
  clinicalData,
}: ClinicalSymptomsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const bodySystemSections = useMemo(() => {
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

  if (bodySystemSections.length === 0 && !clinicalData) return null;

  const clinicalHeader = clinicalData && (() => {
    const clinicalScore = calculateClinicalScore(clinicalData);
    const midCfr = (clinicalData.untreatedFatalityRate.low + clinicalData.untreatedFatalityRate.high) / 2;
    const base = Math.sqrt(midCfr / 100) * 100;
    const morbidityBonus =
      clinicalData.severity === "Life-threatening" ? 20 :
      clinicalData.severity === "Severe" ? 10 :
      clinicalData.severity === "Moderate" ? 5 : 0;
    const whoBonus = clinicalData.whoCategory === 1 ? 10 : clinicalData.whoCategory === 2 ? 5 : 0;
    const b = (val: number | string) => <span style={{ fontWeight: 700, color: "#1c1917" }}>{val}</span>;
    const tooltipRows: TooltipRow[] = [
      { type: "header", text: "Clinical Score" },
      { type: "desc", text: "How often does an untreated bite kill? Real-world outcome data, not lab estimates." },
      { type: "spacer" },
      {
        type: "formula",
        left: <>({b(clinicalData.untreatedFatalityRate.low)} + {b(clinicalData.untreatedFatalityRate.high)}) / 2</>,
        right: `${midCfr}%`,
      },
      {
        type: "formula",
        left: <>sqrt({b(midCfr)} / 100) x 100</>,
        right: `${base.toFixed(0)} pts`,
      },
      { type: "note", text: "sqrt compresses the top end - a 25% CFR isn&apos;t 4x safer than 100%. The scale reflects how bite risk actually curves in practice." },
    ];
    if (morbidityBonus > 0 || whoBonus > 0) {
      tooltipRows.push({ type: "section", text: "Additive Bonuses" });
      tooltipRows.push({ type: "desc", text: "Stacked on top of the CFR base to capture danger not in the fatality rate: severity of injury, systemic damage, and medical burden." });
      if (morbidityBonus > 0) tooltipRows.push({ type: "formula", left: `Severity (${clinicalData.severity})`, right: `+${morbidityBonus}` });
      if (whoBonus > 0) tooltipRows.push({ type: "formula", left: `WHO Category ${clinicalData.whoCategory}`, right: `+${whoBonus}` });
      tooltipRows.push({ type: "note", text: "Prevents high-morbidity snakes from scoring too low just because they rarely kill outright." });
    }
    tooltipRows.push({ type: "result", left: "Score", right: `${clinicalScore}/100` });

    return (
      <div className="mb-6 border-b border-dashed border-stone-300 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-400">Fatality (Untreated)</div>
            <div className="tabular-nums text-lg font-bold text-stone-800">
              {clinicalData.untreatedFatalityRate.low}-{clinicalData.untreatedFatalityRate.high}%
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-400">WHO Importance</div>
            <div className="text-lg font-bold uppercase text-stone-800">
              {clinicalData.whoCategory ? `Cat. ${clinicalData.whoCategory}` : "-"}
            </div>
          </div>
          <div className="sm:text-right">
            <ScoreTooltip rows={tooltipRows} anchor="right" width={268}>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-400">Clinical Score</div>
                <div className="tabular-nums leading-none">
                  <span style={{ fontFamily: COMPRESSED, fontWeight: 800, fontSize: "36px", color: "#1c1917" }}>{clinicalScore}</span>
                  <span className="text-sm font-normal text-stone-400">/100</span>
                </div>
              </div>
            </ScoreTooltip>
          </div>
        </div>
      </div>
    );
  })();

  const content = (
    <>
      {clinicalHeader}
      <div className="space-y-6">
        {bodySystemSections.map((section, i) => (
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
    </>
  );

  return (
    <>
      <div className="relative z-20 mb-8 lg:hidden">
        <div className="relative z-10 px-5 pb-4 pt-4">
          {clinicalData && (() => {
            const stampFile =
              clinicalData.severity === "Life-threatening" ? "Life-threatening-Stamp.png" :
              clinicalData.severity === "Severe" ? "Severe-Stamp.png" :
              clinicalData.severity === "Moderate" ? "Moderate-Stamp.png" :
              clinicalData.severity === "Mild" ? "Mild-Stamp.png" :
              "Negligible-Stamp.png";
            return (
              <Image
                src={`/stamps/${stampFile}`}
                alt={clinicalData.severity}
                aria-hidden
                width={110}
                height={110}
                className="absolute left-1 top-1 z-20 w-[88px] rotate-[-10deg] pointer-events-none select-none"
                style={{ height: "auto" }}
              />
            );
          })()}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
            aria-expanded={isExpanded}
            aria-controls="clinical-severity-mobile"
          >
            <h2
              className="text-center"
              style={{
                fontFamily: COMPRESSED,
                fontWeight: 800,
                fontSize: "34px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#2c2c2c",
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              Clinical Severity
            </h2>
            <p className="text-center text-[12px] font-bold uppercase tracking-[0.04em] text-stone-500">
              {isExpanded ? "Tap to collapse" : "Tap to expand details"}
            </p>
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                id="clinical-severity-mobile"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden pt-6 pb-4"
              >
                <div className="pr-1">
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-[-40px] left-[68px] z-40 hidden w-[45%] max-w-[520px] min-w-[300px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block">
        <motion.div
          onClick={() => setIsExpanded(!isExpanded)}
          initial={{ y: 800 }}
          animate={{ y: isExpanded ? 80 : 710 }}
          whileHover={{
            y: isExpanded ? 80 : 700,
            transition: { delay: 0.3, duration: 0.2, ease: "easeOut" },
          }}
          transition={{ ease: EASE, duration: 0.6 }}
          className="relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto"
          style={{ height: CARD_H }}
        >
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
              filter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.16))",
              WebkitFilter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.16))",
              transform: "translateZ(0)",
            }}
          />

          {clinicalData && (() => {
            const stampFile =
              clinicalData.severity === "Life-threatening" ? "Life-threatening-Stamp.png" :
              clinicalData.severity === "Severe" ? "Severe-Stamp.png" :
              clinicalData.severity === "Moderate" ? "Moderate-Stamp.png" :
              clinicalData.severity === "Mild" ? "Mild-Stamp.png" :
              "Negligible-Stamp.png";
            return (
              <Image
                src={`/stamps/${stampFile}`}
                alt={clinicalData.severity}
                aria-hidden
                width={110}
                height={110}
                className="absolute pointer-events-none select-none z-20"
                style={{
                  width: "110px",
                  height: "auto",
                  top: "2px",
                  left: "2px",
                  transform: "rotate(-8deg)",
                  opacity: 0.92,
                }}
              />
            );
          })()}

          <div className="relative z-10 flex-1 px-12 pt-10 pb-32">
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
              Clinical Severity
            </h2>

            <motion.div animate={{ opacity: isExpanded ? 1 : 0.4 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              {content}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
});

export { ClinicalSymptomsCardComponent as ClinicalSymptomsCard };
export default ClinicalSymptomsCardComponent;
