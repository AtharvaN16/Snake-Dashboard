"use client";

import { useState } from "react";

export interface VenomSubModes {
  classification: boolean;
  potency: boolean;
  yield: boolean;
}

interface VenomPillsProps {
  subModes: VenomSubModes;
  onChange: (modes: VenomSubModes) => void;
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M2 2l8 8M10 2L2 10" />
    </svg>
  );
}

const SUB_OPTIONS: { key: keyof VenomSubModes; label: string }[] = [
  { key: "classification", label: "Classification" },
  { key: "potency", label: "Potency (LD50)" },
  { key: "yield", label: "Yield (mg)" },
];

export function VenomPills({ subModes, onChange }: VenomPillsProps) {
  const [open, setOpen] = useState(false);

  const anyActive = subModes.classification || subModes.potency || subModes.yield;

  const outerClass =
    "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors " +
    (anyActive
      ? "bg-stone-800 text-white shadow-sm"
      : "bg-white/80 text-stone-600 hover:text-stone-800 border border-stone-200/50 backdrop-blur-sm");

  function toggle(key: keyof VenomSubModes) {
    const next = { ...subModes, [key]: !subModes[key] };
    // Activating potency/yield clears classification (they're mutually exclusive).
    // Activating classification clears potency and yield.
    if ((key === "potency" || key === "yield") && next[key]) {
      next.classification = false;
    }
    if (key === "classification" && next.classification) {
      next.potency = false;
      next.yield = false;
    }
    onChange(next);
  }

  function clearAll() {
    onChange({ classification: false, potency: false, yield: false });
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className={outerClass} role="group">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 min-w-0"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={anyActive ? "Venom filter active. Click to change." : "Select venom mode"}
        >
          <span className="truncate">Venom</span>
        </button>
        {anyActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="shrink-0 p-0.5 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Clear venom filters"
          >
            <ClearIcon className="opacity-90 hover:opacity-100" />
          </button>
        )}
      </div>

      <div
        role="listbox"
        className={`overflow-hidden transition-all duration-200 ease-out origin-top grid grid-cols-1 gap-1 ${
          open
            ? "max-h-[200px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 -translate-y-2"
        }`}
      >
        {SUB_OPTIONS.map(({ key, label }) => {
          const isActive = subModes[key];
          // Classification is visually disabled when potency or yield is active
          const isDisabled = key === "classification" && (subModes.potency || subModes.yield);
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={isActive}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) toggle(key);
              }}
              className={[
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap",
                isActive
                  ? "bg-stone-800 text-white shadow-sm"
                  : "bg-white/80 text-stone-600 hover:text-stone-800 border border-stone-200/50 backdrop-blur-sm",
                isDisabled ? "opacity-40 scale-95 pointer-events-none" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
