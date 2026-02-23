import type { VenomSpeed } from "@/lib/types";
import { FlashIcon } from "@/components/icons/FlashIcon";
import { RunnerIcon } from "@/components/icons/RunnerIcon";
import { TurtleIcon } from "@/components/icons/TurtleIcon";

interface VenomSpeedChipProps {
  speed: VenomSpeed;
  className?: string;
}

const iconMap = {
  "Extremely quick": FlashIcon,
  Quick: RunnerIcon,
  Slow: TurtleIcon,
} as const;

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

export function VenomSpeedChip({ speed, className }: VenomSpeedChipProps) {
  const Icon = iconMap[speed];
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
      <Icon className="shrink-0 opacity-70" />
      <span>{speed}</span>
    </span>
  );
}
