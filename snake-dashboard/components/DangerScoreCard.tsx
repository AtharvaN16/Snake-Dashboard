"use client";

import { useState, memo, useMemo, useRef, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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
import { ChevronRight, Zap, Skull, Globe2, Sparkles } from "lucide-react";

const CONTENT_H = 620;
const CARD_H = CONTENT_H;
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";
const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";

interface DangerScoreCardProps {
  snake: Snake;
}

interface DangerTierConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  glowColor: string;
  holoGradient: string;
  tierName: string;
}

function getDangerTier(score: number): DangerTierConfig {
  if (score >= 80) {
    return {
      label: "VERY HIGH DANGER",
      badgeBg: "bg-red-950/90 border-red-500/80",
      badgeText: "text-red-100",
      borderColor: "border-red-600 shadow-red-900/40",
      glowColor: "rgba(220, 38, 38, 0.35)",
      holoGradient: "linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(245,158,11,0.2) 50%, rgba(220,38,38,0.3) 100%)",
      tierName: "APEX HOLO",
    };
  }
  if (score >= 60) {
    return {
      label: "HIGH DANGER",
      badgeBg: "bg-orange-950/90 border-orange-500/80",
      badgeText: "text-orange-100",
      borderColor: "border-orange-500 shadow-orange-900/30",
      glowColor: "rgba(249, 115, 22, 0.3)",
      holoGradient: "linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(234,179,8,0.2) 50%, rgba(249,115,22,0.25) 100%)",
      tierName: "HIGH FOIL",
    };
  }
  if (score >= 40) {
    return {
      label: "MODERATE DANGER",
      badgeBg: "bg-amber-950/90 border-amber-500/80",
      badgeText: "text-amber-100",
      borderColor: "border-amber-400 shadow-amber-900/25",
      glowColor: "rgba(234, 179, 8, 0.25)",
      holoGradient: "linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(132,204,22,0.15) 50%, rgba(234,179,8,0.2) 100%)",
      tierName: "SOLAR FOIL",
    };
  }
  return {
    label: "LOW DANGER",
    badgeBg: "bg-stone-800/90 border-stone-400/80",
    badgeText: "text-stone-200",
    borderColor: "border-stone-400 shadow-stone-900/20",
    glowColor: "rgba(168, 162, 158, 0.2)",
    holoGradient: "linear-gradient(135deg, rgba(214,211,209,0.2) 0%, rgba(168,162,158,0.15) 50%, rgba(214,211,209,0.2) 100%)",
    tierName: "SILVER SPECIMEN",
  };
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

  // 3D Mouse Tilt & Holographic Tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [12, -12]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-12, 12]), { stiffness: 300, damping: 25 });
  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);
  const glareOpacity = useSpring(useTransform(mouseX, [0, 0.5, 1], [0.15, 0.4, 0.15]), { stiffness: 300, damping: 25 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

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
  const tierConfig = getDangerTier(snake.dangerScore);

  const totalSnakesCount = 142;
  const rankNumber = snake.dangerRank ? snake.dangerRank.split("/")[0] : null;

  const cardDetails = (
    <div className="space-y-3.5 text-stone-900">
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
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between border-b border-stone-300/80 pb-1.5">
          <span style={{ fontFamily: COMPRESSED }} className="text-[11px] font-black uppercase tracking-wider text-stone-900">
            REAL-WORLD MODIFIERS
          </span>
        </div>
        <p style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-700 font-medium leading-snug">
          Adjusts intrinsic danger based on encounter conditions.
        </p>

        <div className="space-y-1.5 pt-0.5 text-xs">
          {[
            { icon: Zap, label: "Venom Onset", mod: speedMod, desc: "Action speed & treatment window" },
            { icon: Skull, label: "Delivery", mod: deliveryMod, desc: "Fang efficiency & injection" },
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
        <div className={`relative z-10 px-5 pb-5 pt-4 bg-[#fcfbf9] border-2 ${tierConfig.borderColor} rounded-2xl shadow-xl`}>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded-lg"
            aria-expanded={isExpanded}
            aria-controls={`danger-score-mobile-${snake.id}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-stone-700" />
                <span className="text-[11px] font-black text-stone-700 uppercase tracking-wider">{tierConfig.tierName}</span>
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
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${tierConfig.badgeBg} ${tierConfig.badgeText}`}>
                {tierConfig.label}
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

      {/* Desktop 3D Holographic Specimen Card */}
      <div className="fixed bottom-[-40px] right-[68px] z-40 hidden w-[24%] max-w-[300px] min-w-[260px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block perspective-1000">
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsExpanded(!isExpanded)}
          initial={{ y: 800 }}
          animate={{ 
            y: isExpanded ? -80 : 330,
            rotateX: isExpanded ? 0 : rotateX.get(),
            rotateY: isExpanded ? 0 : rotateY.get(),
          }}
          whileHover={{
            y: isExpanded ? -80 : 315,
            transition: { delay: 0.2, duration: 0.2, ease: "easeOut" },
          }}
          transition={{ ease: EASE, duration: 0.6 }}
          className={`relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto border-2 ${tierConfig.borderColor} rounded-3xl overflow-hidden shadow-2xl transition-shadow duration-300`}
          style={{ 
            height: CARD_H,
            transformStyle: "preserve-3d",
            boxShadow: `0 20px 40px ${tierConfig.glowColor}`,
          }}
        >
          {/* Parchment Background Texture */}
          <div
            aria-hidden
            className="absolute pointer-events-none select-none inset-0"
            style={{
              backgroundImage: "url('/paper/paper-27.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.15))",
            }}
          />

          {/* Simey-Style Holographic Rainbow Foil Layer */}
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-color-dodge transition-opacity duration-300"
            style={{
              background: tierConfig.holoGradient,
            }}
          />

          {/* Dynamic Glare Spotlight Overlay */}
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-200"
            style={{
              opacity: glareOpacity,
              background: useTransform(
                [glareX, glareY],
                ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)`
              ),
            }}
          />

          <div className="relative z-10 flex-1 px-7 pt-8 pb-12">
            {/* Header: Rarity Tier & Rank Badge */}
            <div className="flex items-center justify-between mb-3 border-b border-stone-300/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-stone-700" />
                <span style={{ fontFamily: COMPRESSED }} className="text-[11px] font-black text-stone-700 uppercase tracking-widest">
                  {tierConfig.tierName}
                </span>
              </div>
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
            <div className="flex flex-col items-center mb-4">
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
              <div className={`mt-2 px-3 py-1 rounded-md text-[11px] font-extrabold border tracking-wider shadow-xs ${tierConfig.badgeBg} ${tierConfig.badgeText}`}>
                {tierConfig.label}
              </div>
            </div>

            {/* Card Content Details */}
            <motion.div animate={{ opacity: isExpanded ? 1 : 0.9 }} transition={{ duration: 0.2 }}>
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

