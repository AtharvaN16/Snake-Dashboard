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
      className={cn("inline-flex font-medium text-sm", className)}
      style={pillStyle}
    >
      <span className="shrink-0">{venomTypeIcons[type]}</span>
      <span>{type}</span>
    </span>
  );
}
