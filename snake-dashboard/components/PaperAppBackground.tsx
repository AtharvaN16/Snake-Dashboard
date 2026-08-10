"use client";

export function PaperAppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f3f3f3]">
      {/* Subtle paper grain overlay using SVG filter */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.2]" style={{ filter: "url(#globalNoiseFilter)" }} />
      <svg className="absolute w-0 h-0">
        <filter id="globalNoiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
      </svg>
    </div>
  );
}
