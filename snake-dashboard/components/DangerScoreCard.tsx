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

const CONTENT_H = 680;
const CARD_H = CONTENT_H;
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";

interface DangerScoreCardProps {
  snake: Snake;
}

interface DangerTierConfig {
  label: string;
  stageName: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  glowColor: string;
  holoGradient: string;
  energyIcon: typeof Flame;
  typeSymbol: string;
  typeColor: string;
}

function getDangerTier(score: number): DangerTierConfig {
  if (score >= 80) {
    return {
      label: "VERY HIGH DANGER",
      stageName: "STAGE 2 APEX",
      badgeBg: "bg-red-950/90 border-red-500/80",
      badgeText: "text-red-100",
      cardBg: "from-[#ef4444] via-[#dc2626] to-[#991b1b]",
      glowColor: "rgba(220, 38, 38, 0.4)",
      holoGradient: "linear-gradient(135deg, rgba(239,68,68,0.4) 0%, rgba(245,158,11,0.3) 50%, rgba(220,38,38,0.4) 100%)",
      energyIcon: Flame,
      typeSymbol: "🔥 POISON",
      typeColor: "text-red-700",
    };
  }
  if (score >= 60) {
    return {
      label: "HIGH DANGER",
      stageName: "STAGE 1 HIGH",
      badgeBg: "bg-orange-950/90 border-orange-500/80",
      badgeText: "text-orange-100",
      cardBg: "from-[#f97316] via-[#ea580c] to-[#9a3412]",
      glowColor: "rgba(249, 115, 22, 0.35)",
      holoGradient: "linear-gradient(135deg, rgba(249,115,22,0.35) 0%, rgba(234,179,8,0.25) 50%, rgba(249,115,22,0.35) 100%)",
      energyIcon: Flame,
      typeSymbol: "⚡ STRIKE",
      typeColor: "text-orange-700",
    };
  }
  if (score >= 40) {
    return {
      label: "MODERATE DANGER",
      stageName: "BASIC MODERATE",
      badgeBg: "bg-amber-950/90 border-amber-500/80",
      badgeText: "text-amber-100",
      cardBg: "from-[#eab308] via-[#ca8a04] to-[#854d0e]",
      glowColor: "rgba(234, 179, 8, 0.3)",
      holoGradient: "linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(132,204,22,0.2) 50%, rgba(234,179,8,0.3) 100%)",
      energyIcon: Zap,
      typeSymbol: "🌿 NATURE",
      typeColor: "text-amber-800",
    };
  }
  return {
    label: "LOW DANGER",
    stageName: "BASIC LOW",
    badgeBg: "bg-stone-800/90 border-stone-400/80",
    badgeText: "text-stone-200",
    cardBg: "from-[#9ca3af] via-[#6b7280] to-[#374151]",
    glowColor: "rgba(156, 163, 175, 0.25)",
    holoGradient: "linear-gradient(135deg, rgba(209,213,219,0.3) 0%, rgba(156,163,175,0.2) 50%, rgba(209,213,219,0.3) 100%)",
    energyIcon: Zap,
    typeSymbol: "⚙️ STEEL",
    typeColor: "text-stone-700",
  };
}

function formatModPct(mod: number): { text: string; color: string } {
  const pct = Math.round((mod - 1) * 100);
  if (pct > 0) return { text: `+${pct}%`, color: "text-amber-800 font-bold" };
  if (pct < 0) return { text: `${pct}%`, color: "text-stone-600 font-medium" };
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

  // Leaderboard adjacent snakes computation
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
  const fieldNote = getFieldNote(snake, encounterMod, speedMod);

  const rankNumber = currentIndex !== -1 ? currentIndex + 1 : (snake.dangerRank ? parseInt(snake.dangerRank.split("/")[0], 10) : 0);
  const formattedCardNo = `#${String(rankNumber).padStart(3, "0")}/142`;

  const primaryVenomType = snake.venomTypes?.[0] || "Venomous";
  const energyTypeStr = `${primaryVenomType.toUpperCase()} · ${snake.family.toUpperCase()}`;

  const modPctTotal = Math.round((speedMod * deliveryMod * encounterMod - 1) * 100);
  const modTotalStr = modPctTotal > 0 ? `+${modPctTotal}%` : `${modPctTotal}%`;

  return (
    <>
      {/* Mobile Pokémon Card */}
      <div className="relative z-20 mb-8 lg:hidden">
        {/* Yellow Pokémon Outer Border Frame */}
        <div className="bg-gradient-to-b from-[#fce055] via-[#f5c518] to-[#d4a017] p-2.5 rounded-3xl border-2 border-[#a37905] shadow-2xl">
          <div className="bg-white rounded-2xl p-4 border border-[#785b03] space-y-3">
            {/* Header: Stage & Common Name & HP */}
            <div className="flex items-start justify-between gap-2 border-b-2 border-amber-300 pb-2">
              <div>
                <div className="text-[9px] font-black text-amber-800 uppercase tracking-widest">{tierConfig.stageName}</div>
                <h2 style={{ fontFamily: COMPRESSED }} className="text-xl font-black text-stone-900 leading-none">
                  {snake.commonName}
                </h2>
                <div className="text-[10px] font-serif italic text-stone-600">{snake.scientificName}</div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-red-700 uppercase tracking-wider">DANGER</span>
                <div style={{ fontFamily: COMPRESSED }} className="text-3xl font-black text-red-600 leading-none">
                  {snake.dangerScore} <span className="text-xs text-stone-500 font-bold">HP</span>
                </div>
              </div>
            </div>

            {/* Framed Specimen Portrait */}
            {snake.images?.primary && (
              <div className="p-1 bg-gradient-to-b from-[#e0b738] via-[#b88c14] to-[#805e04] rounded-xl shadow-md">
                <div className="relative h-44 w-full rounded-lg overflow-hidden border border-[#594203]">
                  <Image src={snake.images.primary} alt={snake.commonName} fill className="object-cover" sizes="100vw" />
                </div>
                {/* Gold Sub-Banner Ribbon */}
                <div className="mt-1 bg-gradient-to-r from-[#d9aa27] via-[#f7d768] to-[#d9aa27] text-[#3d2b02] text-[9px] font-extrabold tracking-wider py-0.5 px-2 text-center rounded border border-[#99730f]">
                  NO. {rankNumber} · {snake.family} · {snake.continents.join(", ")}
                </div>
              </div>
            )}

            {/* Attacks / Stat Blocks */}
            <div className="space-y-2 text-xs pt-1">
              {/* Move 1: Intrinsic Danger */}
              <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200">
                <div className="flex items-center justify-between font-black text-stone-900 mb-0.5">
                  <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-red-600 fill-red-600" /> INTRINSIC DANGER</span>
                  <span style={{ fontFamily: COMPRESSED }} className="text-base text-stone-900">{intrinsicExact.toFixed(0)}</span>
                </div>
                <p className="text-[10px] text-stone-600 leading-snug">
                  Lethality 55% (Potency × Yield) + Clinical Severity 45% (Fatality &amp; Morbidity).
                </p>
              </div>

              {/* Move 2: Real-World Strike */}
              <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200">
                <div className="flex items-center justify-between font-black text-stone-900 mb-0.5">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" /> REAL-WORLD STRIKE</span>
                  <span style={{ fontFamily: COMPRESSED }} className="text-base text-stone-900">{modTotalStr}</span>
                </div>
                <p className="text-[10px] text-stone-600 leading-snug">
                  Venom Onset ({formatModPct(speedMod).text}) · Delivery ({formatModPct(deliveryMod).text}) · Exposure ({formatModPct(encounterMod).text}).
                </p>
              </div>
            </div>

            {/* Flavor Text / Field Journal */}
            <div className="p-2 bg-stone-100 rounded-lg border border-stone-200 text-[10px] italic text-stone-700 leading-snug">
              &quot;{fieldNote}&quot;
            </div>

            {/* TCG Weakness / Resistance / Footer */}
            <div className="pt-2 border-t border-amber-200 text-[9px] text-stone-600 flex items-center justify-between font-mono font-bold">
              <span>weakness: <Droplets className="w-3 h-3 inline text-blue-600" /> Antivenom</span>
              <span>resistance: <Shield className="w-3 h-3 inline text-emerald-600" /> Defensive</span>
              <span>retreat: ★★</span>
            </div>

            {/* Flip Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-900 text-stone-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>View Full Formulas &amp; Calculation Math</span>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Authentic 3D Pokémon Trading Card */}
      <div className="fixed bottom-[-20px] right-[68px] z-40 hidden w-[26%] max-w-[330px] min-w-[290px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block perspective-1000">
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
          className="relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto rounded-[24px] shadow-2xl transition-shadow duration-300"
          style={{
            height: CARD_H,
            transformStyle: "preserve-3d",
            boxShadow: `0 20px 45px ${tierConfig.glowColor}`,
          }}
        >
          {/* FRONT FACE OF POKÉMON CARD */}
          <div
            className="absolute inset-0 z-10 flex flex-col p-2.5 bg-gradient-to-b from-[#fce055] via-[#f5c518] to-[#d4a017] rounded-[24px] border-2 border-[#a37905]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Card Content Outer Frame */}
            <div className="flex-1 bg-white rounded-[16px] p-4 border border-[#785b03] flex flex-col justify-between overflow-y-auto relative shadow-inner">
              {/* Simey Holographic Rainbow Foil Layer */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-color-dodge rounded-[16px]"
                style={{ background: tierConfig.holoGradient }}
              />

              {/* Dynamic Glare Spotlight Overlay */}
              <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none mix-blend-overlay rounded-[16px]"
                style={{
                  opacity: glareOpacity,
                  background: useTransform(
                    [glareX, glareY],
                    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)`
                  ),
                }}
              />

              {/* CARD FRONT CONTENT */}
              <div className="relative z-10 space-y-2.5">
                {/* 1. Header Band */}
                <div className="flex items-start justify-between gap-2 border-b-2 border-amber-300 pb-1.5">
                  <div>
                    <div className="text-[9px] font-black text-amber-800 uppercase tracking-widest">{tierConfig.stageName}</div>
                    <h2 style={{ fontFamily: COMPRESSED }} className="text-xl font-black text-stone-900 leading-none">
                      {snake.commonName}
                    </h2>
                    <div className="text-[10px] font-serif italic text-stone-600">{snake.scientificName}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-red-700 uppercase tracking-wider">DANGER</span>
                    <div style={{ fontFamily: COMPRESSED }} className="text-3xl font-black text-red-600 leading-none">
                      {snake.dangerScore} <span className="text-xs text-stone-500 font-bold">HP</span>
                    </div>
                  </div>
                </div>

                {/* 2. Framed Artwork Specimen Window */}
                {snake.images?.primary && (
                  <div className="p-1 bg-gradient-to-b from-[#e0b738] via-[#b88c14] to-[#805e04] rounded-xl shadow-md">
                    <div className="relative h-36 w-full rounded-lg overflow-hidden border border-[#594203]">
                      <Image src={snake.images.primary} alt={snake.commonName} fill className="object-cover" sizes="300px" />
                    </div>
                    {/* Golden Sub-Banner Ribbon */}
                    <div className="mt-1 bg-gradient-to-r from-[#d9aa27] via-[#f7d768] to-[#d9aa27] text-[#3d2b02] text-[9px] font-extrabold tracking-wider py-0.5 px-2 text-center rounded border border-[#99730f] truncate">
                      NO. {rankNumber} · {energyTypeStr} · {snake.continents.join(", ")}
                    </div>
                  </div>
                )}

                {/* 3. Moves & Attack Blocks */}
                <div className="space-y-2 text-xs">
                  {/* Move 1: Intrinsic Danger */}
                  <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200 shadow-2xs">
                    <div className="flex items-center justify-between font-black text-stone-900 mb-0.5">
                      <span className="flex items-center gap-1.5 text-xs"><Flame className="w-3.5 h-3.5 text-red-600 fill-red-600" /> INTRINSIC DANGER</span>
                      <span style={{ fontFamily: COMPRESSED }} className="text-lg text-stone-900">{intrinsicExact.toFixed(0)}</span>
                    </div>
                    <p className="text-[10px] text-stone-600 leading-snug">
                      Lethality 55% (Potency × Yield) + Clinical Severity 45% (Fatality &amp; Morbidity).
                    </p>
                  </div>

                  {/* Move 2: Real-World Strike */}
                  <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200 shadow-2xs">
                    <div className="flex items-center justify-between font-black text-stone-900 mb-0.5">
                      <span className="flex items-center gap-1.5 text-xs"><Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" /> REAL-WORLD STRIKE</span>
                      <span style={{ fontFamily: COMPRESSED }} className="text-lg text-stone-900">{modTotalStr}</span>
                    </div>
                    <p className="text-[10px] text-stone-600 leading-snug">
                      Venom Onset ({formatModPct(speedMod).text}) · Delivery ({formatModPct(deliveryMod).text}) · Exposure ({formatModPct(encounterMod).text}).
                    </p>
                  </div>
                </div>

                {/* 4. Flavor Field Journal Note */}
                <div className="p-2 bg-stone-100/90 rounded-lg border border-stone-200 text-[10px] italic text-stone-700 leading-snug">
                  &quot;{fieldNote}&quot;
                </div>
              </div>

              {/* 5. TCG Footer & Flip Trigger */}
              <div className="relative z-10 pt-2 border-t border-amber-200 space-y-2">
                <div className="text-[9px] text-stone-600 flex items-center justify-between font-mono font-bold">
                  <span>weakness: <Droplets className="w-3 h-3 inline text-blue-600" /> Anti</span>
                  <span>resistance: <Shield className="w-3 h-3 inline text-emerald-600" /> Def</span>
                  <span>retreat: ★★</span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-stone-500 font-mono">
                  <span>illus. Field Guide DB</span>
                  <span className="font-bold text-stone-800">{formattedCardNo} ★★★</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <RotateCw className="w-3.5 h-3.5 text-stone-300" />
                  <span>Flip Card to Math &amp; Formulas</span>
                </button>
              </div>
            </div>
          </div>

          {/* BACK FACE OF POKÉMON CARD (METHODOLOGY & MATH) */}
          <div
            className="absolute inset-0 z-20 flex flex-col p-2.5 bg-gradient-to-b from-[#fce055] via-[#f5c518] to-[#d4a017] rounded-[24px] border-2 border-[#a37905]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="flex-1 bg-[#fcfbf9] rounded-[16px] p-4 border border-[#785b03] flex flex-col justify-between text-stone-900 overflow-y-auto relative">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-amber-300 pb-2">
                  <div>
                    <div className="text-[9px] font-black text-amber-800 uppercase tracking-widest">DANGER FORMULA</div>
                    <h3 style={{ fontFamily: COMPRESSED }} className="text-lg font-black uppercase text-stone-900 leading-none">
                      SCORE METHODOLOGY
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300">0–100 INDEX</span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-stone-700">
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
                    <p className="font-bold text-stone-900 mb-1">1. Intrinsic Danger (55% / 45%)</p>
                    <p className="text-[11px] text-stone-600 mb-1.5">Combines toxicological capacity with human clinical severity.</p>
                    <div className="font-mono text-[10px] bg-white p-1.5 rounded border border-amber-300 text-stone-900">
                      0.55 × Potency + 0.45 × Clinical
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
                    <p className="font-bold text-stone-900 mb-1">2. Real-World Risk Modifiers</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-600">
                      <li><strong>Venom Onset (0.94×–1.08×):</strong> Speed of action.</li>
                      <li><strong>Delivery (0.5×–1.0×):</strong> Fang mechanics &amp; yield.</li>
                      <li><strong>Human Exposure (0.70×–1.10×):</strong> Habitat &amp; disposition.</li>
                    </ul>
                  </div>

                  <div className="p-2 rounded bg-stone-100 border border-stone-200 text-[10px] text-stone-500 italic">
                    Note: An experimental comparative index derived from WHO, SVDB, and published toxicological research.
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-amber-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-amber-400 bg-amber-50 hover:bg-amber-100 text-stone-900 font-bold text-xs flex items-center justify-between"
                >
                  <span>Open Full Accordion View</span>
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <RotateCw className="w-3.5 h-3.5 text-stone-300" />
                  <span>Flip Back to Pokémon Card</span>
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

