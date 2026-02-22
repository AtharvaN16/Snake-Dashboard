"use client";

import { useState } from "react";
import type { Snake } from "@/lib/types";

interface RegionPillsProps {
  selectedRegion: Snake["continent"] | null;
  onChange: (region: Snake["continent"] | null) => void;
  continents: Snake["continent"][];
  /** When true, pills expand in a single column (e.g. phylogeny overlay). Default false = wrap. */
  singleColumn?: boolean;
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M2 2l8 8M10 2L2 10" />
    </svg>
  );
}

export function RegionPills({
  selectedRegion,
  onChange,
  continents,
  singleColumn = false,
}: RegionPillsProps) {
  const [open, setOpen] = useState(false);

  const baseButtonClass =
    "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors " +
    (selectedRegion
      ? "bg-stone-800 text-white shadow-sm"
      : "bg-white/80 text-stone-600 hover:text-stone-800 border border-stone-200/50 backdrop-blur-sm");

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className={baseButtonClass} role="group">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 min-w-0"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={selectedRegion ? `Region: ${selectedRegion}. Click to change.` : "Select region"}
        >
          <span className="truncate">{selectedRegion ?? "Region"}</span>
        </button>
        {selectedRegion && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            className="shrink-0 p-0.5 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Clear region filter"
          >
            <ClearIcon className="opacity-90 hover:opacity-100" />
          </button>
        )}
      </div>
      <div
        role="listbox"
        className={`overflow-hidden transition-all duration-200 ease-out origin-top ${
          open ? "max-h-[320px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2"
        } ${singleColumn ? "grid grid-cols-1 gap-1" : "flex flex-wrap gap-1.5 justify-end"}`}
      >
        {continents.map((continent) => {
          const isActive = selectedRegion === continent;
          return (
            <button
              key={continent}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => {
                onChange(isActive ? null : continent);
                setOpen(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-stone-800 text-white shadow-sm"
                  : "bg-white/80 text-stone-600 hover:text-stone-800 border border-stone-200/50 backdrop-blur-sm"
              }`}
            >
              {continent}
            </button>
          );
        })}
      </div>
    </div>
  );
}
