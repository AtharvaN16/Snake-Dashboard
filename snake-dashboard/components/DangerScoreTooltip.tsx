"use client";

interface DangerScoreTooltipProps {
  children: React.ReactNode;
  className?: string;
}

const TOOLTIP_CONTENT = (
  <div className="text-left">
    <p className="font-semibold text-stone-800 mb-1.5">How danger score is calculated</p>
    <p className="text-xs text-stone-600 leading-relaxed">
      An intrinsic danger score is computed from three factors, then scaled by encounter frequency:
    </p>
    <ul className="mt-1.5 text-xs text-stone-600 space-y-0.5 list-none">
      <li><strong>Lethality (45%)</strong> — lethal doses per bite for a 70kg human (potency × yield)</li>
      <li><strong>Clinical severity (35%)</strong> — untreated fatality rate and WHO medical importance</li>
      <li><strong>Venom speed (20%)</strong> — how quickly symptoms progress after a bite</li>
    </ul>
    <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
      <strong>Encounter modifier</strong> — scales the intrinsic score by how often people encounter the species (×0.6 to ×1.0)
    </p>
  </div>
);

export function DangerScoreTooltip({ children, className = "" }: DangerScoreTooltipProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Tooltip */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 w-64 rounded-lg bg-white border border-stone-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 z-50 pointer-events-none"
        role="tooltip"
      >
        {TOOLTIP_CONTENT}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-stone-200" />
      </div>
      {children}
    </div>
  );
}
