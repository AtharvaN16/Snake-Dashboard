import { cn } from "@/lib/utils";
import type { VenomType } from "@/lib/types";
import { Highlighter } from "./ui/highlighter";

/** Same color mapping as rankings page venom type pills */
export const VENOM_TYPE_CHIP: Record<string, { bg: string; text: string; highlight: string }> = {
  Hemotoxic: { bg: "#FEE2E2", text: "#991B1B", highlight: "#FFCACA" },
  Neurotoxic: { bg: "#EDE9FE", text: "#5B21B6", highlight: "#E0D7FF" },
  Cytotoxic: { bg: "#FEF3C7", text: "#92400E", highlight: "#FFF1BD" },
  Myotoxic: { bg: "#D1FAE5", text: "#065F46", highlight: "#C6F6D5" },
};

interface VenomTypeChipProps {
  type: VenomType;
  className?: string;
}

const venomTypeTooltips: Record<VenomType, string> = {
  Hemotoxic: "Targets blood and circulatory system; disrupts clotting and can cause bleeding disorders.",
  Neurotoxic: "Affects the nervous system; disrupts nerve-muscle communication and can cause paralysis or respiratory failure.",
  Cytotoxic: "Destroys cells and damages tissue; can cause permanent tissue damage and disfigurement.",
  Myotoxic: "Damages muscle tissue, causing myonecrosis (muscle death) and contributing to long-term morbidity.",
};

/** Matches Venom yield / Venom Speed pill style: 4px radius, 4px 8px padding, text-sm, no shadow */
export function VenomTypeChip({ type, className }: VenomTypeChipProps) {
  const colors = VENOM_TYPE_CHIP[type] ?? { bg: "#F3F4F6", text: "#374151", highlight: "#E5E7EB" };

  return (
    <span
      className={cn(
        "group/chip relative inline-flex items-center",
        className
      )}
      style={{
        fontFamily: "var(--font-pangram-compact), system-ui, sans-serif",
        fontWeight: 600,
        fontSize: "16px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#555",
      }}
    >
      <Highlighter 
        color={colors.highlight} 
        animationDuration={800} 
        padding={2}
        strokeWidth={2}
        isView={true}
      >
        <span>{type}</span>
      </Highlighter>
      
      <span
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-[100] mb-2 w-fit -translate-x-1/2 translate-y-1 rounded border border-stone-200 bg-white px-3 py-2 text-xs font-normal leading-snug text-stone-800 opacity-0 shadow-lg transition-all duration-200 group-hover/chip:visible group-hover/chip:translate-y-0 group-hover/chip:opacity-100"
        style={{ minWidth: "240px", maxWidth: "280px", textTransform: "none", letterSpacing: "normal" }}
      >
        {venomTypeTooltips[type]}
        <span
          className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white"
          aria-hidden
        />
      </span>
    </span>
  );
}
