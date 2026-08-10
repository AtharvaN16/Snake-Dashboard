"use client";

export function PaperAppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f3f3f3]">
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.3]" 
        style={{ 
          backgroundImage: "linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} 
      />
    </div>
  );
}
