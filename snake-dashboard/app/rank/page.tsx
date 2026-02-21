"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { getAllSnakes, filterByContinent } from "@/lib/snakeData";
import { getNonSnakes, NonSnake } from "@/lib/nonSnakeData";
import type { Snake } from "@/lib/types";

type ViewMode = "danger" | "potency";
type Rankable = Snake | NonSnake;

function isNonSnake(item: Rankable): item is NonSnake {
  return "category" in item;
}

const NON_SNAKE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Marine: { bg: "bg-stone-50/80", border: "border-stone-200", text: "text-stone-600" },
  Spider: { bg: "bg-stone-50/80", border: "border-stone-200", text: "text-stone-600" },
  Scorpion: { bg: "bg-stone-50/80", border: "border-stone-200", text: "text-stone-600" },
  Insect: { bg: "bg-stone-50/80", border: "border-stone-200", text: "text-stone-600" },
  Centipede: { bg: "bg-stone-50/80", border: "border-stone-200", text: "text-stone-600" },
  Caterpillar: { bg: "bg-stone-50/80", border: "border-stone-200", text: "text-stone-600" },
};

const COLS = "grid-cols-[48px_72px_1fr_164px]";

function getRankDisplay(rank: number): { numeral: string; color: string } {
  const numeral = rank < 10 ? `0${rank}` : `${rank}`;
  if (rank === 1) return { numeral, color: "#B59410" };
  if (rank === 2) return { numeral, color: "#8A8A8A" };
  if (rank === 3) return { numeral, color: "#9C6B3C" };
  return { numeral, color: "#C4B8B0" };
}

function dangerBarColor(score: number): string {
  if (score >= 80) return "#dc2626";
  if (score >= 60) return "#ea580c";
  if (score >= 40) return "#ca8a04";
  if (score >= 20) return "#65a30d";
  return "#16a34a";
}

function ld50BarWidth(ld50: number): number {
  const log = Math.log10(Math.max(0.01, ld50));
  return Math.max(3, Math.min(97, Math.round((1 - (log + 2) / 4.7) * 100)));
}

const VENOM_CHIP: Record<string, { bg: string; text: string }> = {
  Hemotoxic:  { bg: "#FEE2E2", text: "#991B1B" },
  Neurotoxic: { bg: "#EDE9FE", text: "#5B21B6" },
  Cytotoxic:  { bg: "#FEF3C7", text: "#92400E" },
  Myotoxic:   { bg: "#D1FAE5", text: "#065F46" },
};

function formatLD50(val: number | undefined): string {
  if (val == null) return "N/A";
  if (val < 0.001) {
    // For extremely low values like Box Jellyfish (0.000025)
    return val.toExponential(2);
  }
  return val.toFixed(3);
}

function RankTableRow({
  item, rank, viewMode, priority,
}: {
  item: Rankable; rank: number; viewMode: ViewMode; priority?: boolean;
}) {
  const { numeral, color: rankColor } = getRankDisplay(rank);
  const isNS = isNonSnake(item);
  const snake = !isNS ? (item as Snake) : null;
  const nonSnake = isNS ? (item as NonSnake) : null;

  const imageUrl = isNS ? nonSnake?.images?.thumbnail : snake?.images?.thumbnail;
  const scoreColor = snake ? dangerBarColor(snake.dangerScore) : "#C4B8B0";
  const nsStyle = isNS ? NON_SNAKE_STYLES[nonSnake!.category] : null;

  const RowContent = (
    <div className={`grid ${COLS} border-b border-stone-100 last:border-0 group transition-colors duration-150 ${
      isNS ? "bg-stone-50 hover:bg-stone-100" : "hover:bg-stone-50/80"
    }`}>
      {/* Rank */}
      <div className="flex items-center justify-center py-4">
        <span className="font-mono text-[13px] font-bold" style={{ color: rankColor }}>
          {numeral}
        </span>
      </div>

      {/* Photo / Icon */}
      <div className="relative h-full overflow-hidden bg-stone-100 flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.commonName}
            fill
            priority={priority}
            className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.06]"
            sizes="72px"
            unoptimized={isNS}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
            <span className="font-serif text-2xl text-stone-200">{item.commonName[0]}</span>
          </div>
        )}
      </div>

      {/* Identity + Taxonomy */}
      <div className="px-4 py-3 flex flex-col justify-center gap-1.5 min-w-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#2c2c2c] leading-tight truncate">
            {item.commonName}
          </h3>
          <p className="text-[11px] text-stone-400 italic truncate">{item.scientificName}</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-stone-200 bg-white text-stone-500">
            {item.family}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-stone-200 bg-white text-stone-500">
            {item.continent}
          </span>
          {snake?.venomTypes?.slice(0, 2).map((type) => {
            const s = VENOM_CHIP[type] ?? { bg: "#F3F4F6", text: "#374151" };
            return (
              <span key={type} className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: s.bg, color: s.text }}>
                {type}
              </span>
            );
          })}
        </div>
      </div>

      {/* Score */}
      <div className="px-4 py-3 flex flex-col justify-center gap-1.5">
        {viewMode === "danger" && snake ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Danger</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor }}>{snake.dangerScore}</span>
            </div>
            <div className="h-[3px] bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${snake.dangerScore}%`, backgroundColor: scoreColor }} />
            </div>
            {snake.dangerScoreComponents && (
              <div className="hidden sm:flex border-t border-stone-100 pt-1.5">
                {[
                  { k: "Leth", v: Math.round(snake.dangerScoreComponents.lethalityScore) },
                  { k: "Clin", v: Math.round(snake.dangerScoreComponents.clinicalScore) },
                  { k: "Spd",  v: Math.round(snake.dangerScoreComponents.speedScore) },
                  { k: "Enc",  v: Math.round(snake.dangerScoreComponents.encounterScore) },
                ].map(({ k, v }) => (
                  <div key={k} className="flex-1 text-center">
                    <div className="text-[9px] text-stone-400 leading-tight">{k}</div>
                    <div className="text-[10px] font-semibold text-stone-600">{v}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">LD₅₀</span>
              <span className="text-xs font-bold font-mono text-sky-700">
                {formatLD50(item.venomPotency?.ld50Normalized)}
              </span>
            </div>
            {item.venomPotency?.ld50Normalized != null && (
              <div className="h-[3px] bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-sky-500"
                  style={{ width: `${ld50BarWidth(item.venomPotency.ld50Normalized)}%` }} />
              </div>
            )}
            <div className="text-[9px] text-stone-400">mg/kg · lower = more toxic</div>
          </>
        )}
      </div>
    </div>
  );

  if (isNS) {
    return <div title={nonSnake!.description}>{RowContent}</div>;
  }

  return (
    <Link href={`/snakes/${snake!.id}`} id={`rank-row-${snake!.id}`}>
      {RowContent}
    </Link>
  );
}

function RankPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get("view");
  const focusSnakeId = searchParams.get("snakeId");
  const regionParam = searchParams.get("region");
  const [viewMode, setViewMode] = useState<ViewMode>(viewParam === "potency" ? "potency" : "danger");
  const [showOnlySnakes, setShowOnlySnakes] = useState(false);

  const allSnakes = getAllSnakes();
  const allNonSnakes = getNonSnakes();

  const filteredSnakes = useMemo(() => {
    if (regionParam) return filterByContinent(allSnakes, regionParam as Snake["continent"]);
    return allSnakes;
  }, [allSnakes, regionParam]);

  const rankedItems = useMemo(() => {
    if (viewMode === "potency") {
      const items: Rankable[] = [
        ...filteredSnakes.filter(s => s.venomClassification !== "Non-venomous" && s.venomPotency?.ld50Normalized != null)
      ];
      
      if (!showOnlySnakes && !regionParam) {
        items.push(...allNonSnakes);
      } else if (!showOnlySnakes && regionParam) {
        items.push(...allNonSnakes.filter(ns => ns.continent === regionParam));
      }

      return items.sort((a, b) => (a.venomPotency?.ld50Normalized ?? Infinity) - (b.venomPotency?.ld50Normalized ?? Infinity));
    }
    return [...filteredSnakes].sort((a, b) => b.dangerScore - a.dangerScore);
  }, [filteredSnakes, allNonSnakes, viewMode, showOnlySnakes, regionParam]);

  useEffect(() => {
    if (!focusSnakeId) return;
    const el = document.getElementById(`rank-row-${focusSnakeId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-stone-400", "bg-stone-50");
    const t = setTimeout(() => el.classList.remove("ring-2", "ring-stone-400", "bg-stone-50"), 2500);
    return () => clearTimeout(t);
  }, [focusSnakeId, rankedItems]);

  function switchView(mode: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.push(`/rank?${params.toString()}`);
    setViewMode(mode);
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 md:px-10 lg:px-[68px]">
      {/* Back nav */}
      <div className="mb-8 flex items-center gap-2 text-sm text-stone-500">
        <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-mono shadow-sm text-[11px]">Esc</kbd>
        <Link href="/" className="flex items-center gap-1.5 hover:text-stone-800 transition-colors">
          ← Back
        </Link>
      </div>

      {/* Page Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-stone-400 mb-2">Rankings</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[2.5rem] font-serif font-normal text-[#2c2c2c] leading-none">
              {viewMode === "danger" ? "Danger Rankings" : "Venom Potency"}
            </h1>
            <p className="text-stone-500 text-sm mt-2 flex items-center gap-2 flex-wrap">
              <span>{rankedItems.length} species</span>
              <span className="text-stone-300">·</span>
              <span>{viewMode === "danger" ? "composite danger score" : "LD₅₀, lowest = most toxic"}</span>
              {regionParam && (
                <>
                  <span className="text-stone-300">·</span>
                  <span className="font-semibold text-stone-700">{regionParam}</span>
                  <Link href="/rank" className="text-stone-400 hover:text-stone-600 transition-colors text-xs">✕ clear</Link>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Show Only Snakes Toggle */}
            {viewMode === "potency" && (
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={showOnlySnakes} 
                    onChange={() => setShowOnlySnakes(!showOnlySnakes)}
                  />
                  <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${showOnlySnakes ? "bg-stone-800" : "bg-stone-200"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showOnlySnakes ? "translate-x-4" : ""}`} />
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 group-hover:text-stone-800 transition-colors">
                  Only Snakes
                </span>
              </label>
            )}

            {/* Segmented toggle */}
            <div className="inline-flex p-0.5 bg-stone-200/70 rounded-full shrink-0">
              {(["danger", "potency"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => switchView(mode)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? "bg-white text-[#2c2c2c] shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {mode === "danger" ? "Danger" : "Potency"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
        {/* Column headers — same COLS as rows */}
        <div className={`grid ${COLS} border-b-2 border-stone-200 bg-stone-50/90 sticky top-0 z-10 backdrop-blur`}>
          <div className="py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 text-center">#</div>
          <div className="py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 text-center">Photo</div>
          <div className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">Species · Family · Region</div>
          <div className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {viewMode === "danger" ? "Danger Score" : "LD₅₀ (mg/kg)"}
          </div>
        </div>

        {rankedItems.map((item, index) => (
          <RankTableRow
            key={item.id}
            item={item}
            rank={index + 1}
            viewMode={viewMode}
            priority={index < 8}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center mt-8 text-xs text-stone-400">
        Researched by{" "}
        <a href="https://github.com" className="hover:text-stone-600 transition-colors">
          Atharva Nayak
        </a>
      </div>
    </div>
  );
}

export default function RankPage() {
  return (
    <Suspense>
      <RankPageInner />
    </Suspense>
  );
}
