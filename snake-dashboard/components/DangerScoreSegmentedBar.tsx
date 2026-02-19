"use client";

import { useMemo, useState } from "react";
import { getIntrinsicWeights, getEncounterModifier } from "@/lib/dangerScore";
import type { DangerScoreComponents } from "@/lib/types";

interface Segment {
  key: "lethalityScore" | "clinicalScore" | "speedScore";
  label: string;
  shortLabel: string;
  color: string;
  hoverColor: string;
}

// Segments ordered by weight (lethality → clinical → speed)
const SEGMENTS: Segment[] = [
  { key: "lethalityScore", label: "Lethality (doses/bite)", shortLabel: "Lethality", color: "bg-red-500", hoverColor: "bg-red-400" },
  { key: "clinicalScore", label: "Clinical Severity", shortLabel: "Clinical", color: "bg-amber-500", hoverColor: "bg-amber-400" },
  { key: "speedScore", label: "Venom Speed", shortLabel: "Speed", color: "bg-yellow-500", hoverColor: "bg-yellow-400" },
];

interface DangerScoreSegmentedBarProps {
  dangerScore: number;
  components: DangerScoreComponents;
  venomClassification?: string;
}

export function DangerScoreSegmentedBar({
  dangerScore,
  components,
}: DangerScoreSegmentedBarProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const weights = getIntrinsicWeights();
  const encounterModifier = getEncounterModifier(components.encounterScore);

  const segmentData = useMemo(() => {
    return SEGMENTS.map((seg) => {
      const rawScore = components[seg.key];
      const weight = weights[seg.key];
      const contribution = rawScore * weight;
      return { ...seg, rawScore, weight, contribution };
    });
  }, [components, weights]);

  // Total intrinsic score (before encounter modifier)
  const intrinsicTotal = segmentData.reduce((sum, s) => sum + s.contribution, 0);

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

      {/* Segmented bar — shows intrinsic score components */}
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

      {/* Encounter modifier indicator */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-stone-400">
          Intrinsic: {Math.round(intrinsicTotal)}
        </span>
        <span className="text-xs text-stone-500">
          <span className="inline-block w-2 h-2 rounded-sm bg-rose-600 mr-1" />
          Encounter modifier: ×{encounterModifier.toFixed(2)}
        </span>
      </div>

      {/* Hover detail card */}
      <div
        className={`
          mt-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5
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
