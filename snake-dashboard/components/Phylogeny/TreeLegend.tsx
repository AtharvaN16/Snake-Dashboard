import React from "react";
import {
  starburstPath,
  hexagonPath,
  diamondPath,
  roundedSquarePath,
  lightTint,
} from "./treeGeometry";
import type { VenomSubModes } from "./VenomPills";
import {
  venomClassificationColors,
  venomClassificationOrder,
} from "./venomLegendConfig";

const TAXONOMY_LEGEND_ITEMS: ReadonlyArray<
  readonly [string, string, string]
> = [
  ["suborder", "Suborder", "#2d3436"],
  ["infraorder", "Infraorder", "#6c5ce7"],
  ["clade", "Clade", "#00b894"],
  ["family", "Family", "#c44e52"],
  ["genus", "Genus", "#8172b3"],
  ["species", "Species", "#64b5cd"],
];

type TreeLegendMode = "taxonomy" | "venom";

interface TreeLegendProps {
  mode: TreeLegendMode;
  venomSubs?: VenomSubModes;
}

function TaxonomyLegendBody() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
        Taxonomy
      </span>
      <div className="flex flex-col gap-1.5">
        {TAXONOMY_LEGEND_ITEMS.map(([rank, label, color]) => (
          <div key={rank} className="flex items-center gap-2.5">
            <svg width="14" height="14" viewBox="-9 -9 18 18" className="shrink-0">
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
            <span className="text-[11px] text-stone-600 font-medium leading-none">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VenomLegendBody({ venomSubs }: { venomSubs?: VenomSubModes }) {
  const classificationOn = venomSubs?.classification ?? true;
  const potencyOn = venomSubs?.potency ?? false;
  const yieldOn = venomSubs?.yield ?? false;

  return (
    <div className="flex flex-col gap-3.5">
      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
        Venom View
      </span>

      <div className="flex flex-col gap-3">
        {classificationOn && (
          <div className="flex flex-col gap-1.5">
            {venomClassificationOrder.map((cls) => {
              const color = venomClassificationColors[cls];
              return (
                <div key={cls} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-stone-600 font-medium leading-none">
                    {cls}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {potencyOn && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium text-stone-500 uppercase tracking-tight">
              Potency (LD50)
            </span>
            <div className="flex flex-col gap-1">
              <div
                className="h-2 w-full rounded-full border border-stone-200"
                style={{
                  background:
                    "linear-gradient(to right, #ffcc33, #ff4d4d, #6a0572)",
                }}
              />
              <div className="flex justify-between text-[9px] text-stone-500 font-bold tracking-tighter">
                <span>WEAK</span>
                <span>EXTREME</span>
              </div>
            </div>
          </div>
        )}

        {yieldOn && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium text-stone-500 uppercase tracking-tight">
              Max Yield (mg)
            </span>
            <div className="flex items-end gap-3 px-0.5">
              <div className="flex flex-col items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full border border-stone-300 bg-stone-200" />
                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-tighter">Low</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full border border-stone-300 bg-stone-200" />
                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-tighter">
                  Med
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="inline-block h-5 w-5 rounded-full border border-stone-300 bg-stone-200" />
                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-tighter">High</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TreeLegend({ mode, venomSubs }: TreeLegendProps) {
  const isVenom = mode === "venom";

  return (
    <div className={`absolute bottom-4 right-4 pointer-events-none flex flex-col bg-white/80 backdrop-blur-sm rounded-xl px-3.5 py-3 shadow-sm border border-stone-200/60 transition-all duration-300 ${
      isVenom ? "w-48" : "w-36"
    }`}>
      {isVenom ? (
        <VenomLegendBody venomSubs={venomSubs} />
      ) : (
        <TaxonomyLegendBody />
      )}
    </div>
  );
}
