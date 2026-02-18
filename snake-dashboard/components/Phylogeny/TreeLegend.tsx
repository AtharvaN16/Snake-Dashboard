import React from "react";
import {
  starburstPath,
  hexagonPath,
  diamondPath,
  roundedSquarePath,
  lightTint,
} from "./treeGeometry";

const LEGEND_ITEMS: ReadonlyArray<
  readonly [string, string, string]
> = [
  ["suborder", "Suborder", "#2d3436"],
  ["infraorder", "Infraorder", "#6c5ce7"],
  ["clade", "Clade", "#00b894"],
  ["family", "Family", "#c44e52"],
  ["genus", "Genus", "#8172b3"],
  ["species", "Species", "#64b5cd"],
];

export function TreeLegend() {
  return (
    <div className="absolute bottom-3 right-3 pointer-events-none flex flex-col gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 shadow-sm border border-stone-200/60">
      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
        Taxonomy
      </span>
      {LEGEND_ITEMS.map(([rank, label, color]) => (
        <div key={rank} className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="-9 -9 18 18">
            {rank === "suborder" ? (
              <path
                d={starburstPath(7, 18, 0.12)}
                fill={lightTint(color)}
                stroke={color}
                strokeWidth={1.5}
              />
            ) : rank === "family" ? (
              <path
                d={hexagonPath(7)}
                fill={lightTint(color)}
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            ) : rank === "genus" ? (
              <path
                d={diamondPath(7)}
                fill={lightTint(color)}
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="miter"
              />
            ) : rank === "infraorder" ? (
              <path
                d={roundedSquarePath(6)}
                fill={lightTint(color)}
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            ) : (
              <circle
                r={rank === "species" ? 4 : 6}
                fill={lightTint(color)}
                stroke={color}
                strokeWidth={1.5}
              />
            )}
          </svg>
          <span className="text-[11px] text-stone-600">{label}</span>
        </div>
      ))}
    </div>
  );
}
