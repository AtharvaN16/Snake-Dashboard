"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, Check, CheckCircle } from "lucide-react";
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

const COLS = "grid-cols-[48px_100px_1fr_164px]";

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
  item, rank, viewMode, priority, nonSnakeThumbnailOverride, onNonSnakeRefresh,
  activeNonSnakeId, onSelectAndSearch,
}: {
  item: Rankable; rank: number; viewMode: ViewMode; priority?: boolean;
  nonSnakeThumbnailOverride?: string | null;
  onNonSnakeRefresh?: (id: string, thumbnail: string) => void;
  activeNonSnakeId?: string | null;
  onSelectAndSearch?: (id: string, commonName: string) => void;
}) {
  const { numeral, color: rankColor } = getRankDisplay(rank);
  const isNS = isNonSnake(item);
  const snake = !isNS ? (item as Snake) : null;
  const nonSnake = isNS ? (item as NonSnake) : null;

  const baseThumb = isNS ? nonSnake?.images?.thumbnail : snake?.images?.thumbnail;
  const imageUrl = isNS && nonSnakeThumbnailOverride !== undefined
    ? (nonSnakeThumbnailOverride ?? baseThumb)
    : baseThumb;
  const scoreColor = snake ? dangerBarColor(snake.dangerScore) : "#C4B8B0";
  const isActive = isNS && nonSnake && activeNonSnakeId === nonSnake.id;

  const RowContent = (
    <div className={`grid ${COLS} border-b border-stone-100 last:border-0 group transition-colors duration-150 min-h-[72px] ${
      isNS ? "bg-stone-50 hover:bg-stone-100" : "hover:bg-stone-50/80"
    } ${isActive ? "ring-2 ring-emerald-400 ring-inset" : ""}`}>
      {/* Rank */}
      <div className="flex items-center justify-center py-4">
        <span className="font-mono text-[13px] font-bold" style={{ color: rankColor }}>
          {numeral}
        </span>
      </div>

      {/* Photo — snakes: single image; non-snakes: main thumb + Search images button */}
      {!isNS ? (
        <div className="relative self-stretch overflow-hidden bg-stone-100 min-h-[72px]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.commonName}
              fill
              priority={priority}
              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.06]"
              sizes="100px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
              <span className="font-serif text-2xl text-stone-200">{item.commonName[0]}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative self-stretch overflow-hidden bg-stone-100 min-h-[72px]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.commonName}
              fill
              className="object-cover object-top"
              sizes="100px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
              <span className="font-serif text-2xl text-stone-200">{item.commonName[0]}</span>
            </div>
          )}
          {onSelectAndSearch && nonSnake && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectAndSearch(nonSnake.id, item.commonName); }}
              className="absolute bottom-1 right-1 px-1.5 py-1 rounded text-[10px] font-medium bg-black/60 hover:bg-black/80 text-white flex items-center gap-1"
              title="Search for new image options"
            >
              <RefreshCw className="w-3 h-3" />
              Search images
            </button>
          )}
        </div>
      )}

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
          {(isNS ? nonSnake?.venomTypes : snake?.venomTypes)?.slice(0, 2).map((type) => {
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

type Candidate = { index: number; src: string; source: string; score: number };

function RankPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get("view");
  const focusSnakeId = searchParams.get("snakeId");
  const regionParam = searchParams.get("region");
  const [viewMode, setViewMode] = useState<ViewMode>(viewParam === "potency" ? "potency" : "danger");
  const [showOnlySnakes, setShowOnlySnakes] = useState(false);
  const [refreshedThumbnails, setRefreshedThumbnails] = useState<Record<string, string>>({});

  const [activeNonSnakeId, setActiveNonSnakeId] = useState<string | null>(null);
  const [activeNonSnakeName, setActiveNonSnakeName] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleNonSnakeRefresh = useCallback((id: string, thumbnail: string) => {
    setRefreshedThumbnails((prev) => ({ ...prev, [id]: thumbnail }));
  }, []);

  const handleSelectAndSearch = useCallback((id: string, commonName: string) => {
    setActiveNonSnakeId(id);
    setActiveNonSnakeName(commonName);
    setMessage(null);
    setSelectedIndex(null);
    setSearching(true);
    setCandidates([]);
    fetch(`/api/non-snakes/${id}/refresh-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.candidates) && data.candidates.length > 0) {
          setCandidates(data.candidates);
          setMessage(data.message ? { type: "success", text: data.message } : null);
        } else if (data.success && (!data.candidates || data.candidates.length === 0)) {
          setMessage({ type: "error", text: "No new images found." });
        } else {
          const err = data.error || "Search failed";
          setMessage({
            type: "error",
            text: /no (image )?candidates? found|failed to download any/i.test(err) ? "No new images found." : err,
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Network error." }))
      .finally(() => setSearching(false));
  }, []);

  const handleSidebarSearch = useCallback(() => {
    if (!activeNonSnakeId) return;
    setMessage(null);
    setSelectedIndex(null);
    setSearching(true);
    fetch(`/api/non-snakes/${activeNonSnakeId}/refresh-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.candidates) && data.candidates.length > 0) {
          setCandidates(data.candidates);
          setMessage(data.message ? { type: "success", text: data.message } : null);
        } else if (data.success && (!data.candidates || data.candidates.length === 0)) {
          setMessage({ type: "error", text: "No new images found." });
        } else {
          const err = data.error || "Search failed";
          setMessage({
            type: "error",
            text: /no (image )?candidates? found|failed to download any/i.test(err) ? "No new images found." : err,
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Network error." }))
      .finally(() => setSearching(false));
  }, []);

  const handleDone = useCallback(() => {
    if (!activeNonSnakeId || selectedIndex === null || !handleNonSnakeRefresh) return;
    setApplying(true);
    setMessage(null);
    fetch(`/api/non-snakes/${activeNonSnakeId}/refresh-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-primary", candidateIndex: selectedIndex }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.thumbnail) {
          handleNonSnakeRefresh(activeNonSnakeId, data.thumbnail);
          setAllNonSnakes((prev) =>
            prev.map((ns) =>
              ns.id === activeNonSnakeId
                ? { ...ns, images: { thumbnail: data.thumbnail.split("?")[0] } }
                : ns
            )
          );
          setMessage({ type: "success", text: data.message || "Image updated." });
          setCandidates([]);
          setSelectedIndex(null);
        } else {
          setMessage({ type: "error", text: data.error || "Update failed." });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Network error." }))
      .finally(() => setApplying(false));
  }, [activeNonSnakeId, selectedIndex, handleNonSnakeRefresh]);

  const allSnakes = getAllSnakes();
  const [allNonSnakes, setAllNonSnakes] = useState<NonSnake[]>(() => getNonSnakes());

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

      {/* Layout: left sidebar (image options) + table */}
      <div className="max-w-5xl mx-auto flex gap-6">
        {/* Left sidebar — 10 candidate images (only in potency view when non-snakes shown) */}
        {viewMode === "potency" && !showOnlySnakes && (
          <div className="w-[200px] shrink-0">
            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 sticky top-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Image options
              </p>
              {!activeNonSnakeId ? (
                <p className="text-xs text-stone-400">
                  Click &quot;Search images&quot; on a non-snake row to load options.
                </p>
              ) : (
                <>
                  <p className="text-xs font-medium text-stone-700 truncate mb-2" title={activeNonSnakeName}>
                    {activeNonSnakeName}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto">
                    {Array.from({ length: 10 }, (_, i) => i).map((i) => {
                      const c = candidates[i];
                      const selected = selectedIndex === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => c && setSelectedIndex(selected ? null : i)}
                          disabled={!c || applying}
                          className={`relative aspect-[4/3] w-full rounded-lg overflow-hidden border-2 transition-colors ${
                            selected ? "border-emerald-500 ring-1 ring-emerald-400" : "border-stone-200 hover:border-stone-300"
                          } ${!c ? "bg-stone-200" : ""}`}
                        >
                          {c ? (
                            <>
                              <Image
                                src={c.src}
                                alt={`Option ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="120px"
                              />
                              {selected && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handleSidebarSearch}
                      disabled={searching || applying}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${searching ? "animate-spin" : ""}`} />
                      New options
                    </button>
                    <button
                      type="button"
                      onClick={handleDone}
                      disabled={selectedIndex === null || applying}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Done
                    </button>
                  </div>
                  {message && (
                    <p
                      className={`mt-2 text-[10px] px-2 py-1 rounded ${
                        message.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {message.text}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
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
              nonSnakeThumbnailOverride={isNonSnake(item) ? refreshedThumbnails[item.id] : undefined}
              onNonSnakeRefresh={handleNonSnakeRefresh}
              activeNonSnakeId={activeNonSnakeId}
              onSelectAndSearch={viewMode === "potency" && !showOnlySnakes ? handleSelectAndSearch : undefined}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto text-center mt-8 text-xs text-stone-400">
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
