"use client";

import { useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface TooltipPos {
  left: number;
  arrowLeft: number;
  placeBelow: boolean;
}

export function ScoreTooltip({
  rows,
  children,
  anchor = "center",
  width = 260,
}: ScoreTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<TooltipPos | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const computePos = useCallback((): TooltipPos | null => {
    if (!wrapperRef.current || typeof window === "undefined") return null;

    const rect = wrapperRef.current.getBoundingClientRect();
    const margin = 10;
    const gap = 10;

    const estimatedHeight = Math.max(180, rows.length * 28 + 40);
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceAbove < estimatedHeight + gap && spaceBelow > spaceAbove;

    let idealLeft: number;
    if (anchor === "center") {
      idealLeft = rect.left + rect.width / 2 - width / 2;
    } else if (anchor === "right") {
      idealLeft = rect.left;
    } else {
      idealLeft = rect.right - width;
    }

    const clampedLeft = Math.max(margin, Math.min(window.innerWidth - width - margin, idealLeft));
    const triggerCenterVP = rect.left + rect.width / 2;
    const arrowLeft = Math.max(6, Math.min(width - 14, triggerCenterVP - clampedLeft - 4));

    return { left: clampedLeft - rect.left, arrowLeft, placeBelow };
  }, [anchor, width, rows.length]);

  const handleMouseEnter = useCallback(() => {
    setPos(computePos());
    setVisible(true);
  }, [computePos]);

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {visible && pos && (
          <motion.div
            initial={{ opacity: 0, y: pos.placeBelow ? -5 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: pos.placeBelow ? -5 : 5 }}
            transition={{ duration: 0.13 }}
            style={{
              width,
              position: "absolute",
              ...(pos.placeBelow
                ? { top: "calc(100% + 10px)" }
                : { bottom: "calc(100% + 10px)" }),
              left: pos.left,
              zIndex: 200,
              pointerEvents: "none",
            }}
          >
            <div
              className="rounded-md border border-stone-200 bg-white px-4 py-3"
              style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.10)" }}
            >
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
                        <div key={i} className="flex items-center gap-2 pt-1.5 mt-0.5">
                          <div className="flex-1 h-px bg-stone-100" />
                          <span
                            style={{ fontFamily: COMPRESSED }}
                            className="text-[8px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap"
                          >
                            {row.text}
                          </span>
                          <div className="flex-1 h-px bg-stone-100" />
                        </div>
                      );
                    case "desc":
                      return (
                        <p
                          key={i}
                          style={{ fontFamily: COMPACT }}
                          className="text-[11px] text-stone-500 leading-snug"
                        >
                          {row.text}
                        </p>
                      );
                    case "formula":
                      return (
                        <div key={i} className="flex justify-between items-baseline gap-3">
                          <span
                            style={{ fontFamily: COMPACT }}
                            className="text-[11px] text-stone-500"
                          >
                            {row.left}
                          </span>
                          <span
                            style={{ fontFamily: COMPACT }}
                            className="text-[11px] font-bold text-stone-700 tabular-nums shrink-0"
                          >
                            {row.right}
                          </span>
                        </div>
                      );
                    case "result":
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-baseline gap-3 border-t border-stone-100 pt-2 mt-0.5"
                        >
                          <span
                            style={{ fontFamily: COMPRESSED }}
                            className="text-[9px] font-black text-stone-500 uppercase tracking-wide"
                          >
                            {row.left}
                          </span>
                          <span
                            style={{ fontFamily: COMPRESSED }}
                            className="text-[15px] font-black text-stone-900 tabular-nums"
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
                          className="text-[10px] text-stone-400 leading-snug border-t border-stone-100 pt-1.5 mt-0.5"
                        >
                          {row.text}
                        </p>
                      );
                  }
                })}
              </div>
            </div>

            {/* Arrow pointing toward the trigger */}
            <div
              style={{
                position: "absolute",
                left: pos.arrowLeft,
                width: 8,
                height: 8,
                background: "white",
                transform: "rotate(45deg)",
                ...(pos.placeBelow
                  ? {
                      top: -5,
                      borderLeft: "1px solid rgb(231 229 228)",
                      borderTop: "1px solid rgb(231 229 228)",
                    }
                  : {
                      bottom: -5,
                      borderRight: "1px solid rgb(231 229 228)",
                      borderBottom: "1px solid rgb(231 229 228)",
                    }),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
