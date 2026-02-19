"use client";

import { useState } from "react";
import type { DangerScoreComponents } from "@/lib/types";

interface Segment {
  key: keyof DangerScoreComponents;
  label: string;
  shortLabel: string;
  weight: number;
  color: string;
  hoverColor: string;
}

// Segments ordered from highest to lowest weight; colors follow same order (strongest → lightest)
const SEGMENTS: Segment[] = [
  {
    key: "encounterScore",
    label: "Human Encounters",
    shortLabel: "Encounters",
    weight: 0.3,
    color: "bg-rose-600",
    hoverColor: "bg-rose-500",
  },
  {
    key: "potencyScore",
    label: "Venom Potency",
    shortLabel: "Potency",
    weight: 0.25,
    color: "bg-red-500",
    hoverColor: "bg-red-400",
  },
  {
    key: "yieldScore",
    label: "Venom Yield",
    shortLabel: "Yield",
    weight: 0.2,
    color: "bg-orange-500",
    hoverColor: "bg-orange-400",
  },
  {
    key: "clinicalScore",
    label: "Clinical Severity",
    shortLabel: "Clinical",
    weight: 0.15,
    color: "bg-amber-500",
    hoverColor: "bg-amber-400",
  },
  {
    key: "speedScore",
    label: "Venom Speed",
    shortLabel: "Speed",
    weight: 0.1,
    color: "bg-yellow-500",
    hoverColor: "bg-yellow-400",
  },
];

interface DangerScoreSegmentedBarProps {
  dangerScore: number;
  components: DangerScoreComponents;
}

export function DangerScoreSegmentedBar({
  dangerScore,
  components,
}: DangerScoreSegmentedBarProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const segmentData = SEGMENTS.map((seg) => {
    const rawScore = components[seg.key];
    const contribution = rawScore * seg.weight;
    return { ...seg, rawScore, contribution };
  });

  const hoveredSegment = hoveredKey
    ? segmentData.find((s) => s.key === hoveredKey)
    : null;

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-bold text-[#2c2c2c]">Danger Score</h3>
        <span className="text-lg font-extrabold tabular-nums text-[#2c2c2c]">
          {dangerScore}
          <span className="text-xs font-normal text-stone-400">/100</span>
        </span>
      </div>

      {/* Segmented bar */}
      <div className="relative h-5 bg-stone-200 rounded-full overflow-hidden flex">
        {segmentData.map((seg) => {
          const widthPercent = seg.contribution;
          if (widthPercent <= 0) return null;

          const isHovered = hoveredKey === seg.key;
          const isDimmed = hoveredKey !== null && !isHovered;

          return (
            <div
              key={seg.key}
              className={`
                h-full transition-all duration-200 cursor-pointer relative
                ${isHovered ? seg.hoverColor : seg.color}
                ${isDimmed ? "opacity-35" : "opacity-100"}
                first:rounded-l-full last:rounded-r-full
              `}
              style={{ width: `${widthPercent}%` }}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
            />
          );
        })}
      </div>

      {/* Hover detail card */}
      <div
        className={`
          mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5
          transition-all duration-200
          ${hoveredSegment ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        style={{ minHeight: "52px" }}
      >
        {hoveredSegment && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-sm ${hoveredSegment.color}`}
              />
              <span className="text-sm font-medium text-stone-700">
                {hoveredSegment.label}
              </span>
              <span className="text-xs text-stone-400">
                {Math.round(hoveredSegment.weight * 100)}% weight
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold tabular-nums text-stone-800">
                {hoveredSegment.rawScore}
              </span>
              <span className="text-xs text-stone-400">/100</span>
              <span className="text-xs text-stone-400 ml-2">
                (+{hoveredSegment.contribution.toFixed(1)} pts)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {segmentData.map((seg) => (
          <button
            key={seg.key}
            type="button"
            className={`
              flex items-center gap-1 text-xs transition-opacity duration-200
              ${hoveredKey && hoveredKey !== seg.key ? "opacity-35" : "opacity-100"}
            `}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <span
              className={`inline-block w-2 h-2 rounded-sm ${seg.color}`}
            />
            <span className="text-stone-500">{seg.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
