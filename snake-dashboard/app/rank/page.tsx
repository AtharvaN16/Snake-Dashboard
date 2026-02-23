"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { getAllSnakes, filterByContinent } from "@/lib/snakeData";
import { getNonSnakes, NonSnake } from "@/lib/nonSnakeData";
import { VENOM_TYPE_CHIP } from "@/components/VenomTypeChip";
import { RegionPills } from "@/components/RegionPills";
import { Kbd } from "@/components/ui/kbd";
import { DangerScoreInfoBox } from "@/components/DangerScoreInfoBox";
import type { Snake } from "@/lib/types";

type ViewMode = "danger" | "potency";
type Rankable = Snake | NonSnake;

function isNonSnake(item: Rankable): item is NonSnake {
  return "category" in item;
}

const COLS = "grid-cols-[48px_140px_minmax(220px,1fr)_110px_90px_164px] gap-x-3 w-full";

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

  const RowContent = (
    <div className={`grid ${COLS} border-b border-stone-100 last:border-0 group transition-colors duration-150 min-h-[88px] hover:bg-stone-50/80`}>
      {/* Rank */}
      <div className="flex items-center justify-center py-4 min-h-[88px]">
        <span className="font-mono text-[13px] font-bold" style={{ color: rankColor }}>
          {numeral}
        </span>
      </div>

      {/* Photo */}
      <div className="relative self-stretch overflow-hidden bg-stone-100 min-h-[88px]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.commonName}
            fill
            priority={priority}
            className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.06]"
            sizes="140px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
            <span className="text-2xl text-stone-200">{item.commonName[0]}</span>
          </div>
        )}
      </div>

      {/* Identity + Taxonomy */}
      <div className="px-4 py-3 flex flex-col justify-center gap-1.5 min-w-0">
        <div className="min-w-0">
          <p className="text-[11px] text-stone-400 italic truncate">{item.scientificName}</p>
          <h3 className="text-sm font-semibold text-[#2c2c2c] leading-tight truncate flex items-center gap-1.5">
            <span className="truncate">{item.commonName}</span>
            {isNS && (
              <Image src="/icons/spider.svg" alt="" width={16} height={16} className="shrink-0 opacity-70" aria-hidden />
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(isNS ? nonSnake?.venomTypes : snake?.venomTypes)
            ?.filter((type) => type in VENOM_TYPE_CHIP)
            ?.slice(0, 2)
            .map((type) => {
              const s = VENOM_TYPE_CHIP[type];
              return (
                <span key={type} className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: s.bg, color: s.text }}>
                  {type}
                </span>
              );
            })}
        </div>
      </div>

      {/* Family */}
      <div className="pl-2 pr-1 py-3 flex flex-col justify-center min-w-0">
        <span className="text-sm text-stone-400 truncate">{item.family}</span>
      </div>

      {/* Region */}
      <div className="pl-2 pr-1 py-3 flex flex-col justify-center min-w-0">
        <span className="text-sm text-stone-400 truncate">{item.continent}</span>
      </div>

      {/* Score */}
      <div className="px-4 py-3 flex flex-col justify-center min-h-[88px]">
        {viewMode === "danger" && snake ? (
          <div className="flex items-center justify-center w-full flex-1 min-h-0">
            <span className="text-lg font-bold font-mono tabular-nums" style={{ color: scoreColor }}>
              {snake.dangerScore}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full flex-1 min-h-0">
            <span className="text-lg font-bold font-mono text-sky-700">
              {formatLD50(item.venomPotency?.ld50Normalized)}
            </span>
          </div>
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
  const [showOnlySnakes, setShowOnlySnakes] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const allSnakes = getAllSnakes();
  const [allNonSnakes, setAllNonSnakes] = useState<NonSnake[]>(() => getNonSnakes());
  const uniqueContinents = useMemo(
    () => Array.from(new Set(allSnakes.map((s) => s.continent))).sort(),
    [allSnakes]
  );

  useEffect(() => {
    fetch("/api/non-snakes")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (Array.isArray(data)) setAllNonSnakes(data);
      })
      .catch(() => {});
  }, []);

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

  const switchView = useCallback((mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    const query = params.toString();
    router.push(query ? `/rank?${query}` : "/rank");
    setViewMode(mode);
  }, [searchParams, router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select") || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "d") {
        e.preventDefault();
        switchView("danger");
      } else if (key === "p") {
        e.preventDefault();
        switchView("potency");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [switchView]);

  function setRegion(region: Snake["continent"] | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (region) {
      params.set("region", region);
    } else {
      params.delete("region");
    }
    const query = params.toString();
    router.push(query ? `/rank?${query}` : "/rank");
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 md:px-10 lg:px-[68px] pb-14">
      {/* Keyboard shortcut hint (snake info page style) */}
      <div className="mb-8 flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <span className="flex items-center gap-2">
          <Kbd triggerKey="Escape">Esc</Kbd>
          <Link href="/" className="hover:text-stone-800 transition-colors">
            Back
          </Link>
        </span>
      </div>

      {/* Page Header */}
      <div className="max-w-4xl mx-auto mb-8">
        {/* Danger / Potency toggle above title */}
        <div className="mb-4">
          <div className="relative inline-flex p-0.5 bg-stone-200/70 rounded-full shrink-0">
            {/* Sliding pill */}
            <div
              className="absolute top-0.5 bottom-0.5 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-[transform] duration-200 ease-out left-0.5"
              style={{
                transform: viewMode === "danger" ? "translateX(0)" : "translateX(calc(100% + 4px))",
              }}
              aria-hidden
            />
            {(["danger", "potency"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => switchView(mode)}
                className={`relative z-10 flex-1 min-w-[100px] px-5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                  viewMode === mode ? "text-[#2c2c2c]" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <Kbd
                  className="!text-[10px] font-semibold !rounded-sm min-w-[20px] h-5 inline-flex items-center justify-center !border-0 !bg-stone-600 !text-white !shadow-none"
                >
                  {mode === "danger" ? "D" : "P"}
                </Kbd>
                {mode === "danger" ? "Danger" : "Potency"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-[2.5rem] font-extrabold text-[#2c2c2c] leading-none">
            {viewMode === "danger" ? "Danger Rankings" : "Venom Potency"}
          </h1>
        </div>
      </div>

      {/* Region pills - top right, dropdown animates downward like taxonomy page */}
      <div className="fixed top-6 right-4 z-20 flex flex-col items-end lg:right-6">
        <RegionPills
          selectedRegion={regionParam as Snake["continent"] | null}
          onChange={setRegion}
          continents={uniqueContinents}
          singleColumn
        />
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
          <div className={`grid ${COLS} border-b-2 border-stone-200/60 sticky top-4 z-10 rounded-t-2xl bg-white mb-3`}>
            <div className="pt-1 pb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 text-center">#</div>
            <div className="pt-1 pb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 text-center">Photo</div>
            <div className="pt-1 pb-3 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">Species</div>
            <div className="pt-1 pb-3 pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">Family</div>
            <div className="pt-1 pb-3 pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">Region</div>
            <div className="pt-1 pb-3 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">
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

      {/* Other venomous species toggle - bottom right (potency view only) */}
      {viewMode === "potency" && (
        <div className="fixed bottom-6 right-4 z-20 lg:right-6">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={!showOnlySnakes}
                onChange={() => setShowOnlySnakes(!showOnlySnakes)}
              />
              <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${!showOnlySnakes ? "bg-stone-800" : "bg-stone-200"}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${!showOnlySnakes ? "translate-x-4" : ""}`} />
              </div>
            </div>
            <Image src="/icons/spider.svg" alt="" width={20} height={20} className="opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 group-hover:text-stone-800 transition-colors">
              Other venomous species
            </span>
          </label>
        </div>
      )}

      {/* Info link - same position but for danger view */}
      {viewMode === "danger" && (
        <div className="fixed bottom-6 right-4 z-20 lg:right-6">
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
              <span className="text-stone-500 font-bold text-sm">?</span>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 group-hover:text-stone-800 transition-colors">
              How danger score is calculated
            </span>
          </button>
        </div>
      )}

      {showInfo && <DangerScoreInfoBox onClose={() => setShowInfo(false)} />}
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
