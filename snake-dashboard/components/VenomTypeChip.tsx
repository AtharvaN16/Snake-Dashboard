import { cn } from "@/lib/utils";
import type { VenomType } from "@/lib/types";

interface VenomTypeChipProps {
  type: VenomType;
  className?: string;
}

const venomTypeIcons: Record<VenomType, string> = {
  Hemotoxic: "🩸",
  Neurotoxic: "🧠",
  Cytotoxic: "💥",
  Myotoxic: "💪",
};

const venomTypeTooltips: Record<VenomType, string> = {
  Hemotoxic: "Targets blood and circulatory system; disrupts clotting and can cause bleeding disorders.",
  Neurotoxic: "Affects the nervous system; disrupts nerve-muscle communication and can cause paralysis or respiratory failure.",
  Cytotoxic: "Destroys cells and damages tissue; can cause permanent tissue damage and disfigurement.",
  Myotoxic: "Damages muscle tissue, causing myonecrosis (muscle death) and contributing to long-term morbidity.",
};

const pillStyle = {
  padding: "4px 8px",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "4px",
  borderRadius: "4px",
  backgroundColor: "#E5E5E5",
  color: "#000",
};

export function VenomTypeChip({ type, className }: VenomTypeChipProps) {
  return (
    <span
      className={cn(
        "group/chip relative inline-flex font-medium text-sm",
        className
      )}
      style={pillStyle}
    >
      <span className="shrink-0">{venomTypeIcons[type]}</span>
      <span>{type}</span>
      <span
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-fit -translate-x-1/2 translate-y-1 rounded border border-stone-200 bg-white px-3 py-2 text-xs font-normal leading-snug text-stone-800 opacity-0 shadow-lg transition-all duration-200 group-hover/chip:visible group-hover/chip:translate-y-0 group-hover/chip:opacity-100"
        style={{ minWidth: "240px", maxWidth: "280px" }}
      >
        {venomTypeTooltips[type]}
        <span
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white drop-shadow-[0_1px_0_rgba(0,0,0,0.06)]"
          aria-hidden
        />
      </span>
    </span>
  );
}
