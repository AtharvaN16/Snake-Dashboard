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
    <span className={className} style={pillStyle}>
      <span className="font-semibold text-sm">{fangType}</span>
    </span>
  );
}
