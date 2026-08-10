"use client";

export function PaperAppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f3f3f3]">
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4]" 
        style={{ 
          backgroundImage: "radial-gradient(#94a3b8 1.5px, transparent 1.5px)",
          backgroundSize: "20px 20px"
        }} 
      />
    </div>
  );
}
