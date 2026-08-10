"use client";

import { useState, memo, useMemo, useRef, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Snake } from "@/lib/types";
import { getAllSnakes } from "@/lib/snakeData";
import {
  getIntrinsicWeights,
  getSpeedModifier,
  getEncounterModifier,
  getEffectiveEncounterScore,
  getDeliveryModifier,
  deriveVenomClassification,
} from "@/lib/dangerScore";
import { DangerScoreInfoBox } from "@/components/DangerScoreInfoBox";
import { RotateCw, Flame, Zap, Shield, Droplets, ChevronRight } from "lucide-react";

const EASE = [0.32, 0.72, 0, 1] as const;
const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";

interface DangerScoreCardProps {
  snake: Snake;
}

interface DangerTierConfig {
  label: string;
  stageName: string;
  cardFrameGradient: string;
  glowColor: string;
  hpColor: string;
  typeSymbol: string;
}

function getDangerTier(score: number): DangerTierConfig {
  if (score >= 80) {
    return {
      label: "VERY HIGH DANGER",
      stageName: "STAGE 2 APEX",
      cardFrameGradient: "from-[#ef4444] via-[#dc2626] to-[#7f1d1d]",
      glowColor: "rgba(239, 68, 68, 0.5)",
      hpColor: "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]",
      typeSymbol: "🔥 POISON",
    };
  }
  if (score >= 60) {
    return {
      label: "HIGH DANGER",
      stageName: "STAGE 1 HIGH",
      cardFrameGradient: "from-[#f97316] via-[#ea580c] to-[#7c2d12]",
      glowColor: "rgba(249, 115, 22, 0.45)",
      hpColor: "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]",
      typeSymbol: "⚡ STRIKE",
    };
  }
  if (score >= 40) {
    return {
      label: "MODERATE DANGER",
      stageName: "BASIC MODERATE",
      cardFrameGradient: "from-[#f5c518] via-[#d4a017] to-[#785b03]",
      glowColor: "rgba(245, 158, 11, 0.4)",
      hpColor: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]",
      typeSymbol: "🌿 NATURE",
    };
  }
  return {
    label: "LOW DANGER",
    stageName: "BASIC LOW",
    cardFrameGradient: "from-[#9ca3af] via-[#6b7280] to-[#1f2937]",
    glowColor: "rgba(156, 163, 175, 0.3)",
    hpColor: "text-stone-300 drop-shadow-[0_0_8px_rgba(214,211,209,0.4)]",
    typeSymbol: "⚙️ STEEL",
  };
}

function formatModPct(mod: number): { text: string; color: string } {
  const pct = Math.round((mod - 1) * 100);
  if (pct > 0) return { text: `+${pct}%`, color: "text-amber-400 font-bold" };
  if (pct < 0) return { text: `${pct}%`, color: "text-stone-400 font-medium" };
  return { text: "—", color: "text-stone-500 font-medium" };
}

function getFieldNote(snake: Snake, encounterMod: number, speedMod: number): string {
  if (snake.dangerScore >= 85) {
    return "Extremely potent venom with rapid onset; ranks among the world's most dangerous snakes.";
  }
  if (encounterMod > 1.02) {
    return "Potent venom combined with high encounter frequency and aggressive disposition.";
  }
  if (encounterMod < 0.88) {
    return "Exceptionally toxic venom, offset slightly by lower human encounter exposure.";
  }
  if (speedMod > 1.04) {
    return "Rapid venom onset severely restricts the emergency treatment window.";
  }
  if (snake.dangerScore >= 60) {
    return "Presents serious clinical envenoming danger requiring immediate antivenom therapy.";
  }
  return "Low overall bite risk to humans under normal encounter conditions.";
}

const DangerScoreCardComponent = memo(function DangerScoreCard({ snake }: DangerScoreCardProps) {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const leaderboard = useMemo(() => {
    return getAllSnakes().sort((a, b) => b.dangerScore - a.dangerScore);
  }, []);

  const currentIndex = useMemo(() => {
    return leaderboard.findIndex((s) => s.id === snake.id);
  }, [leaderboard, snake.id]);

  // 3D Tilt Mouse tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [14, -14]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-14, 14]), { stiffness: 300, damping: 25 });
  
  // Simey Holofoil dynamic light angles
  const holoAngle = useTransform(mouseX, [0, 1], [90, 150]);
  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);
  const glareOpacity = useSpring(useTransform(mouseX, [0, 0.5, 1], [0.2, 0.5, 0.2]), { stiffness: 300, damping: 25 });

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

  const tierConfig = getDangerTier(snake.dangerScore);
  const fieldNote = getFieldNote(snake, encounterMod, speedMod);

  const rankNumber = currentIndex !== -1 ? currentIndex + 1 : (snake.dangerRank ? parseInt(snake.dangerRank.split("/")[0], 10) : 0);
  const formattedCardNo = `#${String(rankNumber).padStart(3, "0")}/142`;

  const primaryVenomType = snake.venomTypes?.[0] || "Venomous";
  const energyTypeStr = `${primaryVenomType.toUpperCase()} · ${snake.family.toUpperCase()}`;

  const modPctTotal = Math.round((speedMod * deliveryMod * encounterMod - 1) * 100);
  const modTotalStr = modPctTotal > 0 ? `+${modPctTotal}%` : `${modPctTotal}%`;

  return (
    <>
      {/* Mobile Specimen Card */}
      <div className="relative z-20 mb-8 lg:hidden">
        <div className={`bg-gradient-to-b ${tierConfig.cardFrameGradient} p-2 rounded-3xl border-2 border-amber-500/60 shadow-2xl`}>
          <div className="bg-[#141210] rounded-2xl p-4 border border-amber-900/60 space-y-3 text-amber-100">
            {/* Header: Stage & Common Name & HP */}
            <div className="flex items-start justify-between gap-2 border-b border-amber-500/40 pb-2">
              <div>
                <span className="inline-block px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-[9px] uppercase tracking-widest">
                  {tierConfig.stageName}
                </span>
                <h2 style={{ fontFamily: COMPRESSED }} className="text-xl font-black text-amber-50 leading-none mt-1 drop-shadow-md">
                  {snake.commonName}
                </h2>
                <div className="text-[10px] font-serif italic text-amber-200/80">{snake.scientificName}</div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">DANGER</span>
                <div style={{ fontFamily: COMPRESSED }} className={`text-3xl font-black leading-none ${tierConfig.hpColor}`}>
                  {snake.dangerScore} <span className="text-xs text-stone-400 font-bold">HP</span>
                </div>
              </div>
            </div>

            {/* Framed Specimen Portrait */}
            {snake.images?.primary && (
              <div className="p-1 bg-gradient-to-b from-[#fce055] via-[#d4a017] to-[#785b03] rounded-xl shadow-lg">
                <div className="relative h-44 w-full rounded-lg overflow-hidden border border-[#594203]">
                  <Image src={snake.images.primary} alt={snake.commonName} fill className="object-cover" sizes="100vw" />
                </div>
                <div className="mt-1 bg-gradient-to-r from-[#d9aa27] via-[#f7d768] to-[#d9aa27] text-[#3d2b02] text-[9px] font-extrabold tracking-wider py-0.5 px-2 text-center rounded border border-[#99730f] truncate">
                  NO. {rankNumber} · {energyTypeStr} · {snake.continents.join(", ")}
                </div>
              </div>
            )}

            {/* Attacks / Stat Blocks */}
            <div className="space-y-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30">
                <div className="flex items-center justify-between font-black text-amber-100 mb-0.5">
                  <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" /> INTRINSIC DANGER</span>
                  <span style={{ fontFamily: COMPRESSED }} className="text-xl text-amber-400 font-bold">{intrinsicExact.toFixed(0)}</span>
                </div>
                <p className="text-[10px] text-stone-300 leading-snug">
                  Lethality 55% (Potency × Yield) + Clinical Severity 45% (Fatality &amp; Morbidity).
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30">
                <div className="flex items-center justify-between font-black text-amber-100 mb-0.5">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> REAL-WORLD STRIKE</span>
                  <span style={{ fontFamily: COMPRESSED }} className="text-xl text-amber-400 font-bold">{modTotalStr}</span>
                </div>
                <p className="text-[10px] text-stone-300 leading-snug">
                  Venom Onset ({formatModPct(speedMod).text}) · Delivery ({formatModPct(deliveryMod).text}) · Exposure ({formatModPct(encounterMod).text}).
                </p>
              </div>
            </div>

            {/* Flavor Text */}
            <div className="p-2 bg-stone-950/80 rounded-lg border border-stone-800 text-[10px] italic text-stone-300 leading-snug">
              &quot;{fieldNote}&quot;
            </div>

            {/* TCG Footer */}
            <div className="pt-2 border-t border-amber-900/60 text-[9px] text-stone-400 flex items-center justify-between font-mono font-bold">
              <span>weakness: <Droplets className="w-3 h-3 inline text-blue-400" /> Anti</span>
              <span>resistance: <Shield className="w-3 h-3 inline text-emerald-400" /> Def</span>
              <span>retreat: ★★</span>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors"
            >
              <span>View Full Formulas &amp; Math Breakdown</span>
              <ChevronRight className="w-4 h-4 text-stone-950" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Authentic 3D Simey Pokémon Holofoil Card */}
      <div className="fixed bottom-[-10px] right-[68px] z-40 hidden w-[26%] max-w-[340px] min-w-[300px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block perspective-1000">
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ y: 800 }}
          animate={{
            y: 0,
            rotateX: isFlipped ? 0 : rotateX.get(),
            rotateY: isFlipped ? 180 : rotateY.get(),
          }}
          transition={{ ease: EASE, duration: 0.6 }}
          className="relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto rounded-[26px] shadow-2xl transition-shadow duration-300"
          style={{
            height: 690,
            transformStyle: "preserve-3d",
            boxShadow: `0 25px 50px ${tierConfig.glowColor}`,
          }}
        >
          {/* FRONT FACE OF SIMEY POKÉMON HOLO CARD */}
          <div
            className={`absolute inset-0 z-10 flex flex-col p-2.5 bg-gradient-to-b ${tierConfig.cardFrameGradient} rounded-[26px] border-2 border-amber-400/80 shadow-2xl overflow-hidden`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Simey Dynamic Holofoil Rainbow Foil Layer */}
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none z-20 mix-blend-color-dodge opacity-60 rounded-[24px]"
              style={{
                backgroundImage: useTransform(
                  [holoAngle, glareX, glareY],
                  ([angle, x, y]) => `
                    linear-gradient(${angle}deg, 
                      transparent 0%, 
                      rgba(255, 0, 128, 0.45) 20%, 
                      rgba(255, 215, 0, 0.55) 40%, 
                      rgba(0, 255, 200, 0.45) 60%, 
                      rgba(138, 43, 226, 0.45) 80%, 
                      transparent 100%
                    ),
                    radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.85) 0%, transparent 60%)
                  `
                ),
                backgroundSize: "200% 200%",
              }}
            />

            {/* Dynamic Glare Spotlight */}
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay rounded-[24px]"
              style={{
                opacity: glareOpacity,
                background: useTransform(
                  [glareX, glareY],
                  ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.75) 0%, transparent 50%)`
                ),
              }}
            />

            {/* Inner Dark Metallic Card Body */}
            <div
              className="flex-1 rounded-[18px] p-4 border border-amber-900/60 flex flex-col justify-between overflow-y-auto relative shadow-inner text-amber-100"
              style={{
                backgroundImage: "radial-gradient(circle at 50% 30%, #231c15 0%, #120e0a 100%)",
              }}
            >
              <div className="relative z-10 space-y-3">
                {/* Header Band */}
                <div className="flex items-start justify-between gap-2 border-b border-amber-500/40 pb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-[9px] uppercase tracking-widest shadow-xs">
                      {tierConfig.stageName}
                    </span>
                    <h2 style={{ fontFamily: COMPRESSED }} className="text-2xl font-black text-amber-50 leading-none mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {snake.commonName}
                    </h2>
                    <div className="text-[10px] font-serif italic text-amber-200/80">{snake.scientificName}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">DANGER</span>
                    <div style={{ fontFamily: COMPRESSED }} className={`text-4xl font-black leading-none ${tierConfig.hpColor}`}>
                      {snake.dangerScore} <span className="text-xs text-stone-400 font-bold">HP</span>
                    </div>
                  </div>
                </div>

                {/* Framed Specimen Portrait Box */}
                {snake.images?.primary && (
                  <div className="p-1 bg-gradient-to-b from-[#fce055] via-[#d4a017] to-[#785b03] rounded-xl shadow-lg">
                    <div className="relative h-38 w-full rounded-lg overflow-hidden border border-[#594203]">
                      <Image src={snake.images.primary} alt={snake.commonName} fill className="object-cover" sizes="320px" />
                    </div>
                    <div className="mt-1 bg-gradient-to-r from-[#d9aa27] via-[#f7d768] to-[#d9aa27] text-[#3d2b02] text-[9px] font-extrabold tracking-wider py-0.5 px-2 text-center rounded border border-[#99730f] truncate">
                      NO. {rankNumber} · {energyTypeStr} · {snake.continents.join(", ")}
                    </div>
                  </div>
                )}

                {/* Moves & Attack Blocks */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30 shadow-md">
                    <div className="flex items-center justify-between font-black text-amber-100 mb-0.5">
                      <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" /> INTRINSIC DANGER</span>
                      <span style={{ fontFamily: COMPRESSED }} className="text-xl text-amber-400 font-bold">{intrinsicExact.toFixed(0)}</span>
                    </div>
                    <p className="text-[10px] text-stone-300 leading-snug">
                      Lethality 55% (Potency × Yield) + Clinical Severity 45% (Fatality &amp; Morbidity).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30 shadow-md">
                    <div className="flex items-center justify-between font-black text-amber-100 mb-0.5">
                      <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> REAL-WORLD STRIKE</span>
                      <span style={{ fontFamily: COMPRESSED }} className="text-xl text-amber-400 font-bold">{modTotalStr}</span>
                    </div>
                    <p className="text-[10px] text-stone-300 leading-snug">
                      Venom Onset ({formatModPct(speedMod).text}) · Delivery ({formatModPct(deliveryMod).text}) · Exposure ({formatModPct(encounterMod).text}).
                    </p>
                  </div>
                </div>

                {/* Flavor Field Journal Note */}
                <div className="p-2 bg-stone-950/80 rounded-lg border border-stone-800 text-[10px] italic text-stone-300 leading-snug">
                  &quot;{fieldNote}&quot;
                </div>
              </div>

              {/* TCG Footer & Flip Trigger */}
              <div className="relative z-10 pt-2 border-t border-amber-900/60 space-y-2">
                <div className="text-[9px] text-stone-400 flex items-center justify-between font-mono font-bold">
                  <span>weakness: <Droplets className="w-3 h-3 inline text-blue-400" /> Anti</span>
                  <span>resistance: <Shield className="w-3 h-3 inline text-emerald-400" /> Def</span>
                  <span>retreat: ★★</span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono">
                  <span>illus. Field Guide DB</span>
                  <span className="font-bold text-amber-300">{formattedCardNo} ★★★</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition-colors text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <RotateCw className="w-3.5 h-3.5 text-stone-950" />
                  <span>Flip Card to Math &amp; Formulas</span>
                </button>
              </div>
            </div>
          </div>

          {/* BACK FACE OF SIMEY POKÉMON CARD */}
          <div
            className={`absolute inset-0 z-20 flex flex-col p-2.5 bg-gradient-to-b ${tierConfig.cardFrameGradient} rounded-[26px] border-2 border-amber-400/80 shadow-2xl overflow-hidden`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div
              className="flex-1 rounded-[18px] p-4 border border-amber-900/60 flex flex-col justify-between text-amber-100 overflow-y-auto relative shadow-inner"
              style={{
                backgroundImage: "radial-gradient(circle at 50% 30%, #231c15 0%, #120e0a 100%)",
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/40 pb-2">
                  <div>
                    <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest">DANGER FORMULA</div>
                    <h3 style={{ fontFamily: COMPRESSED }} className="text-xl font-black uppercase text-amber-50 leading-none">
                      SCORE METHODOLOGY
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">0–100 INDEX</span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-stone-300">
                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30">
                    <p className="font-bold text-amber-200 mb-1">1. Intrinsic Danger (55% / 45%)</p>
                    <p className="text-[11px] text-stone-400 mb-1.5">Combines toxicological capacity with human clinical severity.</p>
                    <div className="font-mono text-[10px] bg-stone-950 p-1.5 rounded border border-amber-500/40 text-amber-300">
                      0.55 × Potency + 0.45 × Clinical
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30">
                    <p className="font-bold text-amber-200 mb-1">2. Real-World Risk Modifiers</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-400">
                      <li><strong>Venom Onset (0.94×–1.08×):</strong> Speed of action.</li>
                      <li><strong>Delivery (0.5×–1.0×):</strong> Fang mechanics &amp; yield.</li>
                      <li><strong>Human Exposure (0.70×–1.10×):</strong> Habitat &amp; disposition.</li>
                    </ul>
                  </div>

                  <div className="p-2 rounded bg-stone-950/80 border border-stone-800 text-[10px] text-stone-400 italic">
                    Note: An experimental comparative index derived from WHO, SVDB, and published toxicological research.
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-amber-900/60">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-bold text-xs flex items-center justify-between transition-colors"
                >
                  <span>Open Full Interactive View</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition-colors text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <RotateCw className="w-3.5 h-3.5 text-stone-950" />
                  <span>Flip Back to Holo Card</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Methodology Modal */}
      {showInfoModal && (
        <DangerScoreInfoBox onClose={() => setShowInfoModal(false)} />
      )}
    </>
  );
});

export { DangerScoreCardComponent as DangerScoreCard };
export default DangerScoreCardComponent;

