import type { FangType, Snake } from "@/lib/types";

interface FangTypeChipProps {
  fangType: FangType;
  venomousClassification?: Snake["venomClassification"];
  className?: string;
}

export function FangTypeChip({ fangType, venomousClassification, className }: FangTypeChipProps) {
  const isRearFangedMildlyVenomous = 
    fangType === "Rear fangs" && 
    venomousClassification === "Mildly Venomous";

  return (
    <span 
      className={className} 
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-pangram-compact), system-ui, sans-serif",
        fontWeight: 400,
        fontSize: "14px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#555",
      }}
    >
      <span>{fangType}{isRearFangedMildlyVenomous ? " (requires chewing)" : ""}</span>
    </span>
  );
}
