"use client";

import { useState, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Snake } from "@/lib/types";
import {
  getIntrinsicWeights,
  getSpeedModifier,
  getEncounterModifier,
  getEffectiveEncounterScore,
  getDeliveryModifier,
  deriveVenomClassification,
} from "@/lib/dangerScore";
import { DangerScoreInfoBox } from "@/components/DangerScoreInfoBox";
import { ChevronRight, Zap, Skull, Globe2 } from "lucide-react";

const CONTENT_H = 620;
const CARD_H = CONTENT_H;
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";
const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";

interface DangerScoreCardProps {
  snake: Snake;
}

function getDangerLabel(score: number): { label: string; bg: string; text: string } {
  if (score >= 80) return { label: "VERY HIGH DANGER", bg: "bg-red-100/90 border-red-300/80", text: "text-red-900" };
  if (score >= 60) return { label: "HIGH DANGER", bg: "bg-orange-100/90 border-orange-300/80", text: "text-orange-900" };
  if (score >= 40) return { label: "MODERATE DANGER", bg: "bg-amber-100/90 border-amber-300/80", text: "text-amber-900" };
  if (score >= 20) return { label: "LOW DANGER", bg: "bg-lime-100/90 border-lime-300/80", text: "text-lime-900" };
  return { label: "MINIMAL DANGER", bg: "bg-stone-200/80 border-stone-300/80", text: "text-stone-800" };
}

function formatModPct(mod: number): { text: string; color: string } {
  const pct = Math.round((mod - 1) * 100);
  if (pct > 0) return { text: `+${pct}%`, color: "text-amber-800 font-bold" };
  if (pct < 0) return { text: `${pct}%`, color: "text-stone-600 font-medium" };
  return { text: "—", color: "text-stone-500 font-medium" };
}

const DangerScoreCardComponent = memo(function DangerScoreCard({ snake }: DangerScoreCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInfoBox, setShowInfoBox] = useState(false);

  const { intrinsicExact, speedMod, encounterMod, deliveryMod } = useMemo(() => {
    if (!snake.dangerScoreComponents) {
      return { intrinsicExact: 0, speedMod: 1, encounterMod: 1, deliveryMod: 1 };
    }

    const weights = getIntrinsicWeights();
    const intrinsic =
      snake.dangerScoreComponents.lethalityScore * weights.lethalityScore +
      snake.dangerScoreComponents.clinicalScore * weights.clinicalScore;

    const venomClass = deriveVenomClassification(snake.dangerScoreComponents, snake.clinicalData);
    const effectiveEncounterScore = getEffectiveEncounterScore(
      snake.dangerScoreComponents.encounterScore,
      snake.dangerScoreComponents.dispositionScore
    );

    return {
      intrinsicExact: intrinsic,
      speedMod: getSpeedModifier(snake.dangerScoreComponents.speedScore),
      encounterMod: getEncounterModifier(effectiveEncounterScore),
      deliveryMod: getDeliveryModifier(snake.fangType, venomClass),
    };
  }, [snake]);

  const lethalityScore = snake.dangerScoreComponents?.lethalityScore;
  const clinicalScore = snake.dangerScoreComponents?.clinicalScore;
  const ratingBadge = getDangerLabel(snake.dangerScore);

  const totalSnakesCount = 142;
  const rankNumber = snake.dangerRank ? snake.dangerRank.split("/")[0] : null;

  const cardDetails = (
    <div className="space-y-4 text-stone-900">
      {/* Intrinsic Danger Block */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-stone-300/80 pb-1.5">
          <span style={{ fontFamily: COMPRESSED }} className="text-[11px] font-black uppercase tracking-wider text-stone-900">
            INTRINSIC DANGER
          </span>
          <span style={{ fontFamily: COMPACT }} className="text-xs font-black text-stone-900 tabular-nums">
            {intrinsicExact.toFixed(0)} <span className="text-[10px] text-stone-500 font-normal">/ 100</span>
          </span>
        </div>
        <p style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-700 font-medium leading-snug">
          What the venom can do + real-world clinical outcomes.
        </p>

        {lethalityScore != null && clinicalScore != null && (
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2 rounded-lg bg-stone-200/50 border border-stone-300/60">
              <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Lethality · 55%</div>
              <div className="text-sm font-black text-stone-900 tabular-nums">{lethalityScore}</div>
              <div className="text-[10px] text-stone-600 leading-none mt-0.5">Potency × Yield</div>
            </div>
            <div className="p-2 rounded-lg bg-stone-200/50 border border-stone-300/60">
              <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Clinical · 45%</div>
              <div className="text-sm font-black text-stone-900 tabular-nums">{clinicalScore}</div>
              <div className="text-[10px] text-stone-600 leading-none mt-0.5">Fatality + Morbidity</div>
            </div>
          </div>
        )}
      </div>

      {/* Real-World Risk Modifiers */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between border-b border-stone-300/80 pb-1.5">
          <span style={{ fontFamily: COMPRESSED }} className="text-[11px] font-black uppercase tracking-wider text-stone-900">
            REAL-WORLD MODIFIERS
          </span>
        </div>
        <p style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-700 font-medium leading-snug">
          Adjusts intrinsic danger based on encounter conditions.
        </p>

        <div className="space-y-1.5 pt-1 text-xs">
          {[
            { icon: Zap, label: "Venom Onset", mod: speedMod, desc: "Action speed & antivenom window" },
            { icon: Skull, label: "Delivery", mod: deliveryMod, desc: "Fang mechanics & injection efficiency" },
            { icon: Globe2, label: "Human Exposure", mod: encounterMod, desc: "Habitat overlap & disposition" },
          ].map(({ icon: Icon, label, mod, desc }) => {
            const formatted = formatModPct(mod);
            return (
              <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-stone-100/80 border border-stone-300/60">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                  <div>
                    <div className="font-bold text-stone-900 text-[11px]">{label}</div>
                    <div className="text-[10px] text-stone-600">{desc}</div>
                  </div>
                </div>
                <div className={`font-mono text-xs ${formatted.color} tabular-nums shrink-0 ml-2`}>
                  {formatted.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology Action Button */}
      <div className="pt-2 border-t border-stone-300/80">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoBox(true);
          }}
          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-bold shadow-xs"
        >
          <span>How is this calculated?</span>
          <ChevronRight className="w-4 h-4 text-stone-400" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Accordion Card */}
      <div className="relative z-20 mb-8 lg:hidden">
        <div className="relative z-10 px-5 pb-5 pt-4 bg-[#fcfbf9] border border-stone-300/90 rounded-2xl shadow-xl">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded-lg"
            aria-expanded={isExpanded}
            aria-controls={`danger-score-mobile-${snake.id}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-black text-stone-500 uppercase tracking-wider">
                DANGER SCORE
              </div>
              {rankNumber && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/rank?view=danger&snakeId=${snake.id}`);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-stone-900 text-stone-100 font-mono font-bold text-xs hover:bg-stone-800 transition-colors"
                >
                  #{rankNumber} OF {totalSnakesCount}
                </button>
              )}
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1">
                <span style={{ fontFamily: COMPRESSED }} className="text-6xl font-black text-stone-900 leading-none">
                  {snake.dangerScore}
                </span>
                <span className="text-lg font-bold text-stone-500">/ 100</span>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${ratingBadge.bg} ${ratingBadge.text}`}>
                {ratingBadge.label}
              </span>
            </div>

            <div className="text-center text-xs font-bold uppercase tracking-wider text-stone-600 mt-2">
              {isExpanded ? "Tap to collapse" : "Tap for full scoring breakdown →"}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                id={`danger-score-mobile-${snake.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden pt-4 border-t border-stone-200 mt-3"
              >
                {cardDetails}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop Sliding Specimen Card */}
      <div className="fixed bottom-[-40px] right-[68px] z-40 hidden w-[24%] max-w-[300px] min-w-[260px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block">
        <motion.div
          onClick={() => setIsExpanded(!isExpanded)}
          initial={{ y: 800 }}
          animate={{ y: isExpanded ? -80 : 330 }}
          whileHover={{
            y: isExpanded ? -80 : 315,
            transition: { delay: 0.2, duration: 0.2, ease: "easeOut" },
          }}
          transition={{ ease: EASE, duration: 0.6 }}
          className="relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto"
          style={{ height: CARD_H }}
        >
          {/* Parchment Background Frame */}
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
              filter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.15))",
              WebkitFilter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.15))",
              transform: "translateZ(0)",
            }}
          />

          <div className="relative z-10 flex-1 px-7 pt-9 pb-12">
            {/* Header: Title & Rank */}
            <div className="flex items-center justify-between mb-4 border-b border-stone-300/80 pb-2">
              <span style={{ fontFamily: COMPRESSED }} className="text-xs font-black text-stone-600 uppercase tracking-widest">
                DANGER SCORE
              </span>
              {rankNumber && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/rank?view=danger&snakeId=${snake.id}`);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-stone-900 text-stone-100 font-mono font-bold text-[11px] hover:bg-stone-800 transition-colors shadow-xs"
                >
                  #{rankNumber} OF {totalSnakesCount}
                </button>
              )}
            </div>

            {/* Hero Score & Rating Badge */}
            <div className="flex flex-col items-center mb-5">
              <div className="flex items-baseline gap-1">
                <span
                  style={{
                    fontFamily: COMPRESSED,
                    fontSize: "76px",
                    fontWeight: 900,
                    lineHeight: 0.9,
                    color: "#1c1917",
                  }}
                >
                  {snake.dangerScore}
                </span>
                <span className="text-xl font-bold text-stone-600">/ 100</span>
              </div>
              <div className={`mt-2 px-3 py-1 rounded-md text-[11px] font-extrabold border tracking-wider shadow-xs ${ratingBadge.bg} ${ratingBadge.text}`}>
                {ratingBadge.label}
              </div>
            </div>

            {/* Card Content Details */}
            <motion.div animate={{ opacity: isExpanded ? 1 : 0.85 }} transition={{ duration: 0.2 }}>
              {cardDetails}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Methodology Modal */}
      {showInfoBox && (
        <DangerScoreInfoBox onClose={() => setShowInfoBox(false)} />
      )}
    </>
  );
});

export { DangerScoreCardComponent as DangerScoreCard };
export default DangerScoreCardComponent;

