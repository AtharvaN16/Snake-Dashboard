"use client";

export function PaperAppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f5f0e6]">
      {/* Grid Pattern with warmer line color */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4]" 
        style={{ 
          backgroundImage: "linear-gradient(to right, #d4c5b0 1px, transparent 1px), linear-gradient(to bottom, #d4c5b0 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} 
      />
      {/* Subtle vignette for an aged paper feel */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.6]"
        style={{
          background: "radial-gradient(circle at center, transparent 40%, #e3d9c8 100%)"
        }}
      />
    </div>
  );
}
