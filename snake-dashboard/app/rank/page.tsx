"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { getAllSnakes, filterByContinent } from "@/lib/snakeData";
import { VenomTypeChip } from "@/components/VenomTypeChip";
import { getDangerScoreBadgeColor } from "@/lib/dangerScore";
import type { Snake } from "@/lib/types";

type ViewMode = "danger" | "potency";

/** Light background + dark text for small tags (rankings only) */
function getClassificationTagStyle(venomClassification: Snake["venomClassification"]) {
  switch (venomClassification) {
    case "Highly Venomous":
      return { bg: "#FFDADA", text: "#B22222" };
    case "Venomous":
      return { bg: "#FFE4CC", text: "#C2410C" };
    case "Moderately Venomous":
      return { bg: "#FEF08A", text: "#854D0E" };
    case "Mildly Venomous":
      return { bg: "#DCFCE7", text: "#166534" };
    case "Non-venomous":
    default:
      return { bg: "#F3F4F6", text: "#4B5563" };
  }
}

function RankTableRow({ snake, rank, viewMode }: { snake: Snake; rank: number; viewMode: ViewMode }) {
  const tagStyle = getClassificationTagStyle(snake.venomClassification);
  
  return (
    <Link
      href={`/snakes/${snake.id}`}
      id={`rank-row-${snake.id}`}
      className="grid grid-cols-[80px_200px_1fr_180px_120px] gap-4 py-4 px-6 hover:bg-stone-50 transition-colors border-b border-stone-200 items-center group"
    >
      {/* Rank */}
      <div className="flex items-center justify-center">
        <span
          className="text-2xl font-bold"
          style={{
            color: rank <= 3 ? "#FF7373" : rank <= 10 ? "#FFAB73" : "rgba(0, 0, 0, 0.7)",
          }}
        >
          #{rank}
        </span>
      </div>

      {/* Snake Image */}
      <div className="relative h-24 w-full rounded-lg overflow-hidden bg-stone-100">
        {snake.images?.thumbnail ? (
          <Image
            src={snake.images.thumbnail}
            alt={snake.commonName}
            fill
            className="object-cover"
            sizes="200px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">
            🐍
          </div>
        )}
      </div>

      {/* Snake Info */}
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="font-bold text-lg text-[#2c2c2c] group-hover:text-stone-700 transition-colors truncate">
          {snake.commonName}
        </h3>
        <p className="text-sm text-stone-500 italic truncate">
          {snake.scientificName}
        </p>
        {snake.venomTypes && snake.venomTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {snake.venomTypes.slice(0, 2).map((type) => (
              <VenomTypeChip key={type} type={type} className="text-xs" />
            ))}
            {snake.venomTypes.length > 2 && (
              <span className="text-xs text-stone-400">+{snake.venomTypes.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Classification */}
      <div className="flex justify-center">
        <span
          className="text-xs font-medium px-3 py-1.5 rounded"
          style={{
            backgroundColor: tagStyle.bg,
            color: tagStyle.text,
          }}
        >
          {snake.venomClassification}
        </span>
      </div>

      {/* Score (Danger or Potency depending on view) */}
      {viewMode === "danger" ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-green-500 transition-all"
              style={{ width: `${snake.dangerScore}%` }}
            />
          </div>
          <span
            className="inline-flex font-bold text-sm px-3 py-1 rounded"
            style={{
              backgroundColor: "#E5E5E5",
              color: "#000",
            }}
          >
            {snake.dangerScore}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-stone-500 text-center">LD₅₀ (SC)</div>
          <span
            className="inline-flex font-bold text-sm px-3 py-1 rounded"
            style={{
              backgroundColor: "#E5E5E5",
              color: "#000",
            }}
          >
            {snake.venomPotency?.ld50Normalized
              ? `${snake.venomPotency.ld50Normalized.toFixed(3)} mg/kg`
              : "N/A"}
          </span>
        </div>
      )}
    </Link>
  );
}

function RankPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get("view");
  const focusSnakeId = searchParams.get("snakeId");
  const regionParam = searchParams.get("region");
  const [viewMode, setViewMode] = useState<ViewMode>(
    viewParam === "potency" ? "potency" : "danger"
  );

  const allSnakes = getAllSnakes();

  // Filter by region if specified
  const filteredSnakes = useMemo(() => {
    if (regionParam) {
      const continent = regionParam as Snake["continent"];
      return filterByContinent(allSnakes, continent);
    }
    return allSnakes;
  }, [allSnakes, regionParam]);

  const rankedSnakes = useMemo(() => {
    if (viewMode === "potency") {
      // Sort by LD50 (ascending - lower is more potent), filter venomous only
      return filteredSnakes
        .filter(
          (s) =>
            s.venomClassification !== "Non-venomous" &&
            s.venomPotency?.ld50Normalized != null
        )
        .sort((a, b) => {
          const aLd50 = a.venomPotency?.ld50Normalized ?? Infinity;
          const bLd50 = b.venomPotency?.ld50Normalized ?? Infinity;
          return aLd50 - bLd50;
        });
    }
    // Default: sort by danger score descending
    return [...filteredSnakes].sort((a, b) => b.dangerScore - a.dangerScore);
  }, [filteredSnakes, viewMode]);

  useEffect(() => {
    if (!focusSnakeId) return;
    const el = document.getElementById(`rank-row-${focusSnakeId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-stone-400", "bg-stone-50");

    const timeout = setTimeout(() => {
      el.classList.remove("ring-2", "ring-stone-400", "bg-stone-50");
    }, 2500);

    return () => clearTimeout(timeout);
  }, [focusSnakeId, rankedSnakes]);

  return (
    <div className="min-h-screen bg-background py-8 px-[68px]">
      {/* Back navigation */}
      <div className="mb-6 flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <span className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            Esc
          </kbd>
          <Link href="/" className="hover:text-stone-800 transition-colors">
            Back
          </Link>
        </span>
      </div>

      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="text-5xl">{viewMode === "danger" ? "🏆" : "⚗️"}</div>
        </div>
        <h1 className="text-[2.75rem] font-serif font-normal text-[#2c2c2c] leading-tight mb-2">
          {viewMode === "danger" ? "Snake Danger Rankings" : "Venom Potency Ladder"}
        </h1>
        <p className="text-stone-600 text-lg">
          {viewMode === "danger"
            ? "Most dangerous to least dangerous, sorted by danger score"
            : "Venom toxicity drop by drop — ranked by LD₅₀ (lower mg/kg = more toxic per dose)"}
        </p>
      </div>

      {/* View Toggle and Region Filter */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col items-center gap-3">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("view", "danger");
              router.push(`/rank?${params.toString()}`);
              setViewMode("danger");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "danger"
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Danger Rankings
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("view", "potency");
              router.push(`/rank?${params.toString()}`);
              setViewMode("potency");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "potency"
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Potency Ladder
          </button>
        </div>
        
        {/* Region Filter Indicator */}
        {regionParam && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-600">Filtered by region:</span>
            <span className="font-semibold text-stone-800">{regionParam}</span>
            <Link
              href="/rank"
              className="text-stone-500 hover:text-stone-700 underline text-xs"
            >
              Clear filter
            </Link>
          </div>
        )}
      </div>

      {/* Rankings Table */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[80px_200px_1fr_180px_120px] gap-4 py-4 px-6 bg-stone-100 border-b-2 border-stone-300">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wide text-center">
            Rank
          </div>
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wide">
            Image
          </div>
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wide">
            Snake
          </div>
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wide text-center">
            Classification
          </div>
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wide text-center">
            {viewMode === "danger" ? "Score" : "LD₅₀"}
          </div>
        </div>

        {/* Table Body */}
        <div>
          {rankedSnakes.map((snake, index) => (
            <RankTableRow
              key={snake.id}
              snake={snake}
              rank={index + 1}
              viewMode={viewMode}
            />
          ))}
        </div>
      </div>

      {/* Footer Attribution */}
      <div className="text-center mt-8 text-sm text-stone-600">
        <p>
          Researched 🔬 by{" "}
          <a
            href="https://github.com"
            className="hover:text-stone-900 transition-colors no-underline"
          >
            Atharva
          </a>
        </p>
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
