"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";
const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";

export type TooltipRow =
  | { type: "header"; text: string }
  | { type: "desc"; text: string }
  | { type: "formula"; left: ReactNode; right: ReactNode }
  | { type: "section"; text: string }
  | { type: "spacer" }
  | { type: "result"; left: string; right: string }
  | { type: "note"; text: string };

interface ScoreTooltipProps {
  rows: TooltipRow[];
  children: ReactNode;
  anchor?: "left" | "right" | "center";
  width?: number;
}

export function ScoreTooltip({
  rows,
  children,
}: ScoreTooltipProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-help rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220]"
            role="dialog"
            aria-modal="true"
            aria-label="Score details"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Close score details"
              onClick={() => setOpen(false)}
            />

            <div className="absolute inset-x-4 top-1/2 z-10 mx-auto w-full max-w-md -translate-y-1/2 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <div
                  style={{ fontFamily: COMPRESSED }}
                  className="text-[10px] font-black uppercase tracking-widest text-stone-500"
                >
                  Score Details
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  {rows.map((row, i) => {
                    switch (row.type) {
                      case "spacer":
                        return <div key={i} className="h-1" />;
                      case "header":
                        return (
                          <div
                            key={i}
                            style={{ fontFamily: COMPRESSED }}
                            className="text-[9px] font-black text-stone-400 uppercase tracking-widest"
                          >
                            {row.text}
                          </div>
                        );
                      case "section":
                        return (
                          <div key={i} className="mt-0.5 flex items-center gap-2 pt-1.5">
                            <div className="h-px flex-1 bg-stone-100" />
                            <span
                              style={{ fontFamily: COMPRESSED }}
                              className="whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-stone-400"
                            >
                              {row.text}
                            </span>
                            <div className="h-px flex-1 bg-stone-100" />
                          </div>
                        );
                      case "desc":
                        return (
                          <p
                            key={i}
                            style={{ fontFamily: COMPACT }}
                            className="text-[11px] leading-snug text-stone-500"
                          >
                            {row.text}
                          </p>
                        );
                      case "formula":
                        return (
                          <div key={i} className="flex items-baseline justify-between gap-3">
                            <span
                              style={{ fontFamily: COMPACT }}
                              className="text-[11px] text-stone-500"
                            >
                              {row.left}
                            </span>
                            <span
                              style={{ fontFamily: COMPACT }}
                              className="shrink-0 tabular-nums text-[11px] font-bold text-stone-700"
                            >
                              {row.right}
                            </span>
                          </div>
                        );
                      case "result":
                        return (
                          <div
                            key={i}
                            className="mt-0.5 flex items-baseline justify-between gap-3 border-t border-stone-100 pt-2"
                          >
                            <span
                              style={{ fontFamily: COMPRESSED }}
                              className="text-[9px] font-black uppercase tracking-wide text-stone-500"
                            >
                              {row.left}
                            </span>
                            <span
                              style={{ fontFamily: COMPRESSED }}
                              className="tabular-nums text-[15px] font-black text-stone-900"
                            >
                              {row.right}
                            </span>
                          </div>
                        );
                      case "note":
                        return (
                          <p
                            key={i}
                            style={{ fontFamily: COMPACT }}
                            className="mt-0.5 border-t border-stone-100 pt-1.5 text-[10px] leading-snug text-stone-400"
                          >
                            {row.text}
                          </p>
                        );
                    }
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
