"use client";

import { useState, memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Snake } from "@/lib/types";
import {
  getIntrinsicWeights,
  getSpeedModifier,
  getEncounterModifier,
  getDeliveryModifier,
  deriveVenomClassification
} from "@/lib/dangerScore";

const CONTENT_H = 580;
const CARD_H = CONTENT_H;
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";
const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";

interface DangerScoreCardProps {
  snake: Snake;
}

const DangerScoreCardComponent = memo(function DangerScoreCard({ snake }: DangerScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { intrinsicScore, speedMod, encounterMod, deliveryMod } = useMemo(() => {
    if (!snake.dangerScoreComponents) return { intrinsicScore: 0, speedMod: 1, encounterMod: 1, deliveryMod: 1 };

    const weights = getIntrinsicWeights();
    const intrinsic =
      snake.dangerScoreComponents.lethalityScore * weights.lethalityScore +
      snake.dangerScoreComponents.clinicalScore * weights.clinicalScore;

    const venomClass = deriveVenomClassification(snake.dangerScoreComponents, snake.clinicalData);

    return {
      intrinsicScore: Math.round(intrinsic),
      speedMod: getSpeedModifier(snake.dangerScoreComponents.speedScore),
      encounterMod: getEncounterModifier(snake.dangerScoreComponents.encounterScore),
      deliveryMod: getDeliveryModifier(snake.fangType, venomClass)
    };
  }, [snake]);

  const modifiers = [
    {
      label: "Speed",
      value: speedMod,
      text: snake.venomSpeed === "Extremely quick" ? "Extremely quick" :
            snake.venomSpeed === "Quick" ? "Quick-acting" : "Slow-acting",
      direction: speedMod > 1 ? "up" : speedMod < 1 ? "down" : "neutral"
    },
    {
      label: "Delivery",
      value: deliveryMod,
      text: snake.fangType === "Rear fangs" && deliveryMod < 1 ? "Rear fangs" : "Efficient delivery",
      direction: deliveryMod > 1 ? "up" : deliveryMod < 1 ? "down" : "neutral"
    },
    {
      label: "Encounter",
      value: encounterMod,
      text: snake.humanEncounterChance === "Very High" ? "Ubiquitous" :
            snake.humanEncounterChance === "High" ? "Commonly encountered" :
            snake.humanEncounterChance === "Moderate" ? "Moderate encounter" : "Rarely encountered",
      direction: encounterMod > 1 ? "up" : encounterMod < 1 ? "down" : "neutral"
    }
  ];

  const lethalityScore = snake.dangerScoreComponents?.lethalityScore;
  const clinicalScore = snake.dangerScoreComponents?.clinicalScore;

  return (
    <div
      className="fixed bottom-[-40px] right-[68px] z-40 w-[24%] max-w-[280px] min-w-[240px] hover:z-[60] transition-[z-index] delay-300 duration-0 pointer-events-none"
    >
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ y: 800 }}
        animate={{ y: isExpanded ? 20 : 310 }}
        whileHover={{
          y: isExpanded ? 20 : 295,
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
            bottom: -100,
            backgroundImage: "url('/paper/paper-27.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            filter: "brightness(1.08) saturate(0.7) drop-shadow(0 -20px 50px rgba(0,0,0,0.15))",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex-1 px-8 pt-10 pb-16">
          <div className="text-center mb-6">
            <h2
              style={{
                fontFamily: COMPRESSED,
                fontWeight: 800,
                fontSize: "30px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#2c2c2c",
                lineHeight: 1,
                marginBottom: "4px"
              }}
            >
              Danger Analysis
            </h2>
            <div className="text-[12px] font-black text-stone-400 uppercase tracking-widest">
              RANK {snake.dangerRank}
            </div>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="flex items-baseline gap-1">
              <span
                style={{
                  fontFamily: COMPRESSED,
                  fontSize: "76px",
                  fontWeight: 800,
                  lineHeight: 0.9,
                  color: "#000"
                }}
              >
                {snake.dangerScore}
              </span>
              <span className="text-base font-bold text-stone-400">/100</span>
            </div>
            <div
              style={{
                fontFamily: COMPACT,
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#78716c",
                marginTop: "4px"
              }}
            >
              Final Danger Score
            </div>
          </div>

          <motion.div
            animate={{ opacity: isExpanded ? 1 : 0.4 }}
            className="space-y-4 transition-opacity duration-300"
          >
            {/* Venom Core — links to Venom Profile + Clinical Severity cards */}
            <div className="border-b border-stone-200 pb-3">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[13px] font-bold text-stone-500 uppercase tracking-wider">Venom Core</span>
                <span className="text-base font-bold text-stone-800">{intrinsicScore}/100</span>
              </div>
              {lethalityScore != null && clinicalScore != null && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-stone-400">Lethality Score <span className="text-stone-300">(55%)</span></span>
                    <span className="text-[12px] font-bold text-stone-600 tabular-nums">{lethalityScore}/100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-stone-400">Clinical Score <span className="text-stone-300">(45%)</span></span>
                    <span className="text-[12px] font-bold text-stone-600 tabular-nums">{clinicalScore}/100</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-1">
              {modifiers.map((mod) => (
                <div key={mod.label} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">
                      {mod.label}
                    </span>
                    <span className="text-[13px] font-bold text-stone-700 leading-none">
                      {mod.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tabular-nums text-stone-800">
                      ×{mod.value.toFixed(2)}
                    </span>
                    <span className={`text-[12px] ${
                      mod.direction === "up" ? "text-emerald-600" :
                      mod.direction === "down" ? "text-red-500" : "text-stone-300"
                    }`}>
                      {mod.direction === "up" ? "▲" : mod.direction === "down" ? "▼" : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

export { DangerScoreCardComponent as DangerScoreCard };
export default DangerScoreCardComponent;
