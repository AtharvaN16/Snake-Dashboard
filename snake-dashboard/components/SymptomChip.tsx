import { cn } from "@/lib/utils";

interface SymptomChipProps {
  symptom: string;
  className?: string;
}

const pillStyle = {
  backgroundColor: "#E5E5E5",
  color: "#000",
};

export function SymptomChip({ symptom, className }: SymptomChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        className
      )}
      style={pillStyle}
    >
      <span>{symptom}</span>
    </span>
  );
}
