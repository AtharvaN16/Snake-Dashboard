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
import { RotateCw, Zap, Skull, Sparkles, ChevronRight } from "lucide-react";

const CONTENT_H = 680;
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
      holoGradient: "linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(245,158,11,0.2) 50%, rgba(220,38,38,0.35) 100%)",
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

function getFieldNote(snake: Snake, encounterMod: number, speedMod: number): string {
  if (snake.dangerScore >= 85) {
    return "Exceptionally toxic venom with rapid onset; ranks among the world's most dangerous snakes.";
  }
  if (encounterMod > 1.02) {
    return "Potent venom combined with high encounter frequency and defensive temperament.";
  }
  if (encounterMod < 0.88) {
    return "Extremely toxic venom, but real-world risk is lowered by remote human exposure.";
  }
  if (speedMod > 1.04) {
    return "Rapid venom onset severely restricts the emergency medical treatment window.";
  }
  if (snake.dangerScore >= 60) {
    return "Presents serious clinical envenoming risk requiring immediate antivenom administration.";
  }
  if (snake.dangerScore >= 40) {
    return "Moderate envenomation danger requiring prompt medical evaluation.";
  }
  return "Low overall bite risk under standard human encounter conditions.";
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

  const prevSnake = currentIndex > 0 ? leaderboard[currentIndex - 1] : null;
  const nextSnake = currentIndex < leaderboard.length - 1 ? leaderboard[currentIndex + 1] : null;

  // 3D Tilt Mouse tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [10, -10]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), { stiffness: 300, damping: 25 });
  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);
  const glareOpacity = useSpring(useTransform(mouseX, [0, 0.5, 1], [0.15, 0.35, 0.15]), { stiffness: 300, damping: 25 });

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

  const totalSnakesCount = leaderboard.length || 142;
  const rankNumber = currentIndex !== -1 ? currentIndex + 1 : (snake.dangerRank ? parseInt(snake.dangerRank.split("/")[0], 10) : 0);

  const primaryVenomType = snake.venomTypes?.[0] || "Venomous";
  const typeBadge = `${primaryVenomType.toUpperCase()} · ${snake.family.toUpperCase()}`;

  return (
    <>
      {/* Mobile Specimen Card */}
      <div className="relative z-20 mb-8 lg:hidden">
        <div className={`relative z-10 px-5 pb-5 pt-4 bg-[#fcfbf9] border-2 ${tierConfig.borderColor} rounded-2xl shadow-xl space-y-4`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div>
              <div style={{ fontFamily: COMPRESSED }} className="text-xl font-black text-stone-900 leading-none">
                {snake.commonName}
              </div>
              <div className="text-[11px] font-serif italic text-stone-500">{snake.scientificName}</div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/rank?view=danger&snakeId=${snake.id}`)}
              className="px-2.5 py-1 rounded-full bg-stone-900 text-stone-100 font-mono font-bold text-xs"
            >
              #{rankNumber} OF {totalSnakesCount}
            </button>
          </div>

          {/* Image Portrait */}
          {snake.images?.primary && (
            <div className="relative h-40 w-full rounded-xl overflow-hidden border border-stone-300 shadow-inner">
              <Image
                src={snake.images.primary}
                alt={snake.commonName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 300px"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-stone-200 uppercase tracking-wider font-bold">
                {typeBadge}
              </div>
            </div>
          )}

          {/* Hero Score */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-100 border border-stone-200">
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">DANGER RATING</div>
              <div className={`mt-0.5 inline-block px-2 py-0.5 rounded text-[11px] font-black border ${tierConfig.badgeBg} ${tierConfig.badgeText}`}>
                {tierConfig.label}
              </div>
            </div>
            <div className="text-right">
              <span style={{ fontFamily: COMPRESSED }} className="text-5xl font-black text-stone-900 leading-none">
                {snake.dangerScore}
              </span>
              <span className="text-xs font-bold text-stone-500 ml-1">/ 100</span>
            </div>
          </div>

          {/* Stats Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold border-b border-stone-200 pb-1">
              <span>INTRINSIC DANGER</span>
              <span className="font-mono text-stone-900 tabular-nums">{intrinsicExact.toFixed(0)} / 100</span>
            </div>
            {lethalityScore != null && clinicalScore != null && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-stone-100 border border-stone-200">
                  <div className="text-stone-500 font-bold uppercase text-[9px]">Lethality (55%)</div>
                  <div className="font-black text-stone-900 text-sm tabular-nums">{lethalityScore}</div>
                </div>
                <div className="p-2 rounded bg-stone-100 border border-stone-200">
                  <div className="text-stone-500 font-bold uppercase text-[9px]">Clinical (45%)</div>
                  <div className="font-black text-stone-900 text-sm tabular-nums">{clinicalScore}</div>
                </div>
              </div>
            )}
          </div>

          {/* Field Note */}
          <p className="text-[11px] italic text-stone-600 border-l-2 border-stone-400 pl-2 py-0.5">
            &quot;{fieldNote}&quot;
          </p>

          {/* Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="w-full py-2.5 px-3 rounded-lg bg-stone-900 text-stone-100 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <span>Full Methodology &amp; Calculation</span>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Desktop 3D Flip Card */}
      <div className="fixed bottom-[-30px] right-[68px] z-40 hidden w-[26%] max-w-[320px] min-w-[280px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block perspective-1000">
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
          className={`relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto border-2 ${tierConfig.borderColor} rounded-3xl overflow-hidden shadow-2xl transition-shadow duration-300 bg-[#fcfbf9]`}
          style={{
            height: CARD_H,
            transformStyle: "preserve-3d",
            boxShadow: `0 20px 40px ${tierConfig.glowColor}`,
          }}
        >
          {/* FRONT FACE OF CARD */}
          <div
            className="absolute inset-0 z-10 flex flex-col p-6 overflow-y-auto"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Parchment Background */}
            <div
              aria-hidden
              className="absolute pointer-events-none select-none inset-0 opacity-80"
              style={{
                backgroundImage: "url('/paper/paper-27.png')",
                backgroundSize: "100% 100%",
              }}
            />

            {/* Simey Holographic Foil Layer */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-color-dodge"
              style={{ background: tierConfig.holoGradient }}
            />

            {/* Glare Spotlight Overlay */}
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{
                opacity: glareOpacity,
                background: useTransform(
                  [glareX, glareY],
                  ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)`
                ),
              }}
            />

            {/* Content Container */}
            <div className="relative z-10 flex-1 flex flex-col justify-between space-y-3">
              {/* Header: Name & Rank */}
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-stone-300 pb-1.5">
                  <div className="min-w-0 flex-1">
                    <h2 style={{ fontFamily: COMPRESSED }} className="text-xl font-black text-stone-900 leading-none truncate">
                      {snake.commonName}
                    </h2>
                    <p className="text-[11px] font-serif italic text-stone-600 truncate mt-0.5">{snake.scientificName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/rank?view=danger&snakeId=${snake.id}`);
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-stone-900 text-stone-100 font-mono font-bold text-[11px] shrink-0"
                  >
                    #{rankNumber}
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">
                  <span>{typeBadge}</span>
                  <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {tierConfig.tierName}</span>
                </div>
              </div>

              {/* Framed Specimen Portrait Box */}
              {snake.images?.primary && (
                <div className="relative h-32 w-full rounded-xl overflow-hidden border-2 border-stone-300/80 shadow-md group">
                  <Image
                    src={snake.images.primary}
                    alt={snake.commonName}
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold">
                    <span className="truncate">{snake.commonName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/60 font-mono">{snake.dangerScore} PT</span>
                  </div>
                </div>
              )}

              {/* Hero Score Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-100/90 border border-stone-300/80">
                <div>
                  <div className="text-[9px] font-black text-stone-500 uppercase tracking-wider">DANGER SCORE</div>
                  <div className={`mt-0.5 inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${tierConfig.badgeBg} ${tierConfig.badgeText}`}>
                    {tierConfig.label}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: COMPRESSED }} className="text-5xl font-black text-stone-900 leading-none">
                    {snake.dangerScore}
                  </span>
                  <span className="text-xs font-bold text-stone-500">/ 100</span>
                </div>
              </div>

              {/* Stat Blocks */}
              <div className="space-y-2 text-xs">
                {/* Intrinsic Danger */}
                <div className="p-2 rounded-lg bg-stone-100/80 border border-stone-300/60">
                  <div className="flex justify-between items-center font-bold text-stone-900 mb-0.5">
                    <span className="flex items-center gap-1 text-[11px]"><Skull className="w-3 h-3 text-red-600" /> INTRINSIC DANGER</span>
                    <span className="font-mono text-xs">{intrinsicExact.toFixed(0)}</span>
                  </div>
                  {lethalityScore != null && clinicalScore != null && (
                    <div className="flex justify-between text-[10px] text-stone-600 pt-0.5 border-t border-stone-200">
                      <span>Lethality (55%): <strong className="text-stone-900">{lethalityScore}</strong></span>
                      <span>Clinical (45%): <strong className="text-stone-900">{clinicalScore}</strong></span>
                    </div>
                  )}
                </div>

                {/* Encounter Modifiers */}
                <div className="p-2 rounded-lg bg-stone-100/80 border border-stone-300/60">
                  <div className="flex justify-between items-center font-bold text-stone-900 mb-1 text-[11px]">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-600" /> STRIKE &amp; EXPOSURE</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                    <div className="p-1 rounded bg-stone-200/60">
                      <div className="text-stone-500 text-[8px] uppercase">Onset</div>
                      <div className={`font-mono ${formatModPct(speedMod).color}`}>{formatModPct(speedMod).text}</div>
                    </div>
                    <div className="p-1 rounded bg-stone-200/60">
                      <div className="text-stone-500 text-[8px] uppercase">Delivery</div>
                      <div className={`font-mono ${formatModPct(deliveryMod).color}`}>{formatModPct(deliveryMod).text}</div>
                    </div>
                    <div className="p-1 rounded bg-stone-200/60">
                      <div className="text-stone-500 text-[8px] uppercase">Exposure</div>
                      <div className={`font-mono ${formatModPct(encounterMod).color}`}>{formatModPct(encounterMod).text}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Note */}
              <p className="text-[10px] italic text-stone-700 leading-snug border-l-2 border-stone-400 pl-2">
                &quot;{fieldNote}&quot;
              </p>

              {/* Adjacent Leaderboard Ladder */}
              <div className="pt-1.5 border-t border-stone-300/80">
                <div className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">LEADERBOARD LADDER</div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {prevSnake ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/snakes/${prevSnake.id}`);
                      }}
                      className="p-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-left truncate transition-colors"
                      title={`#${currentIndex} ${prevSnake.commonName}`}
                    >
                      <div className="text-[8px] text-stone-500">▲ #{currentIndex}</div>
                      <div className="font-bold text-stone-800 truncate">{prevSnake.commonName}</div>
                    </button>
                  ) : (
                    <div className="p-1 rounded bg-stone-50 border border-stone-100 text-stone-300 text-[8px] text-center flex items-center justify-center">#1 TOP</div>
                  )}

                  <div className="p-1 rounded bg-stone-900 text-stone-100 border border-stone-800 text-left truncate">
                    <div className="text-[8px] text-stone-400">★ #{rankNumber}</div>
                    <div className="font-bold truncate">{snake.commonName}</div>
                  </div>

                  {nextSnake ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/snakes/${nextSnake.id}`);
                      }}
                      className="p-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-left truncate transition-colors"
                      title={`#${currentIndex + 2} ${nextSnake.commonName}`}
                    >
                      <div className="text-[8px] text-stone-500">▼ #{currentIndex + 2}</div>
                      <div className="font-bold text-stone-800 truncate">{nextSnake.commonName}</div>
                    </button>
                  ) : (
                    <div className="p-1 rounded bg-stone-50 border border-stone-100 text-stone-300 text-[8px] text-center flex items-center justify-center">END</div>
                  )}
                </div>
              </div>

              {/* 3D Flip Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5 text-stone-300" />
                <span>Flip to Calculation &amp; Formulas</span>
              </button>
            </div>
          </div>

          {/* BACK FACE OF CARD (METHODOLOGY & FORMULAS) */}
          <div
            className="absolute inset-0 z-20 flex flex-col p-6 bg-[#f7f5f0] text-stone-900 overflow-y-auto"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* Parchment Background */}
            <div
              aria-hidden
              className="absolute pointer-events-none select-none inset-0 opacity-80"
              style={{
                backgroundImage: "url('/paper/paper-27.png')",
                backgroundSize: "100% 100%",
              }}
            />

            <div className="relative z-10 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-3">
                  <h3 style={{ fontFamily: COMPRESSED }} className="text-lg font-black uppercase text-stone-900 tracking-wider">
                    DANGER SCORE METHODOLOGY
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">0–100 INDEX</span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-stone-700">
                  <div className="p-2.5 rounded-lg bg-stone-200/60 border border-stone-300/80">
                    <p className="font-bold text-stone-900 mb-1">1. Intrinsic Danger (55% / 45%)</p>
                    <p className="text-[11px] text-stone-600 mb-1">Combines toxicological capacity with human clinical outcomes.</p>
                    <div className="font-mono text-[10px] bg-[#f5f2ea] p-1.5 rounded border border-stone-300 text-stone-900">
                      0.55 × Potency + 0.45 × Clinical
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-200/60 border border-stone-300/80">
                    <p className="font-bold text-stone-900 mb-1">2. Real-World Risk Modifiers</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-600">
                      <li><strong>Venom Onset (0.94×–1.08×):</strong> Speed of action.</li>
                      <li><strong>Delivery (0.5×–1.0×):</strong> Fang mechanics &amp; yield.</li>
                      <li><strong>Human Exposure (0.70×–1.10×):</strong> Habitat &amp; disposition.</li>
                    </ul>
                  </div>

                  <div className="p-2 rounded bg-stone-100 border border-stone-200 text-[10px] text-stone-500 italic">
                    Note: An experimental comparative model derived from WHO, SVDB, and published toxicological data.
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-300">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-stone-400 bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs flex items-center justify-between"
                >
                  <span>Open Interactive Accordion View</span>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors text-xs font-bold flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5 text-stone-300" />
                  <span>Flip Back to Specimen Card</span>
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

