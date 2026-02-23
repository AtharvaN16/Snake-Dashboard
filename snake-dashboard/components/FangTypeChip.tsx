import type { FangType } from "@/lib/types";

interface FangTypeChipProps {
  fangType: FangType;
  className?: string;
}

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

export function FangTypeChip({ fangType, className }: FangTypeChipProps) {
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
      <span>{fangType}</span>
    </span>
  );
}
