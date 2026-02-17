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
      style={pillStyle}
    >
      <Icon className="shrink-0" />
      <span className="font-semibold text-sm">{speed}</span>
    </span>
  );
}
