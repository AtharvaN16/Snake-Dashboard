import type { VenomYield } from "@/lib/types";
import { YieldIcon } from "@/components/icons/YieldIcon";

type YieldLevel = VenomYield["qualitative"];

interface VenomYieldChipProps {
  yield: VenomYield;
  className?: string;
}

const yieldToDrops: Record<YieldLevel, 1 | 2 | 3 | 4> = {
  "Extremely High": 4,
  High: 3,
  Moderate: 2,
  Low: 1,
  "Very Low": 1,
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

export function VenomYieldChip({ yield: venomYield, className }: VenomYieldChipProps) {
  const drops = yieldToDrops[venomYield.qualitative];
  return (
    <span 
      className={className} 
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-pangram-compact), system-ui, sans-serif",
        fontWeight: 400,
        fontSize: "14px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#555",
      }}
    >
      <YieldIcon drops={drops} className="shrink-0 opacity-70" />
      <span>{venomYield.qualitative}</span>
    </span>
  );
}
