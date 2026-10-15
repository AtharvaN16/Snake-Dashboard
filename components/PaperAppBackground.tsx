"use client";

export function PaperAppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#fbfaf8]">
      {/* Grid Pattern with lighter, cooler lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.3]" 
        style={{ 
          backgroundImage: "linear-gradient(to right, #e2e0db 1px, transparent 1px), linear-gradient(to bottom, #e2e0db 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} 
      />
      {/* Extremely subtle vignette to maintain depth without the heavy yellow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          background: "radial-gradient(circle at center, transparent 50%, #f0ede6 100%)"
        }}
      />
    </div>
  );
}
