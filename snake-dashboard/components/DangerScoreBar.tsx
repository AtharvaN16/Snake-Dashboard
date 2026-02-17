import { cn } from "@/lib/utils";
import { getDangerScoreColor } from "@/lib/dangerScore";
import { DangerScoreTooltip } from "@/components/DangerScoreTooltip";

interface DangerScoreBarProps {
  score: number;
  className?: string;
  showLabel?: boolean;
  showTooltip?: boolean;
}

export function DangerScoreBar({
  score,
  className,
  showLabel = true,
  showTooltip = false,
}: DangerScoreBarProps) {
  const gradientColor = getDangerScoreColor(score);

  const content = (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-2 text-sm">
          <span className="font-medium">Danger Score</span>
          <span className="font-bold">{score}/100</span>
        </div>
      )}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute top-0 left-0 h-full bg-gradient-to-r transition-all duration-500",
            gradientColor
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );

  if (showTooltip) {
    return <DangerScoreTooltip>{content}</DangerScoreTooltip>;
  }
  return content;
}
