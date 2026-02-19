import Link from "next/link";
import type { Snake } from "@/lib/types";

interface MisidentificationWarningProps {
  snake: Snake;
  confusedSnakes: Snake[];
}

export function MisidentificationWarning({
  snake,
  confusedSnakes,
}: MisidentificationWarningProps) {
  const isVenomous = snake.venomClassification !== "Non-venomous";

  // Only the dangerous pairs (venomous ↔ non-venomous, or highly ↔ moderately)
  const dangerousPairs = confusedSnakes.filter((other) => {
    const otherVenomous = other.venomClassification !== "Non-venomous";
    if (isVenomous !== otherVenomous) return true;
    if (
      snake.venomClassification === "Highly Venomous" &&
      (other.venomClassification === "Venomous" ||
        other.venomClassification === "Moderately Venomous" ||
        other.venomClassification === "Mildly Venomous")
    )
      return true;
    return false;
  });

  if (dangerousPairs.length === 0) return null;

  return (
    <div
      className="relative z-20 max-w-[760px] mb-5 rounded-xl overflow-hidden"
      style={{
        border: "1.5px solid rgba(220, 80, 60, 0.25)",
        background: "rgba(255, 245, 243, 0.95)",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px]"
        style={{ background: "#DC3C28" }}
      />

      <div className="pl-5 pr-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Label */}
        <span
          className="shrink-0 text-xs font-bold uppercase tracking-wide"
          style={{
            padding: "2px 6px",
            borderRadius: "3px",
            background: "#DC3C28",
            color: "#fff",
            letterSpacing: "0.06em",
          }}
        >
          High misidentification risk
        </span>

        {/* Pill pairs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {dangerousPairs.map((other) => {
            const otherIsVenomous = other.venomClassification !== "Non-venomous";
            return (
              <div key={other.id} className="flex items-center gap-1.5">
                <span
                  className="text-sm font-semibold"
                  style={{
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: isVenomous ? "#FF7373" : "#CCCCCC",
                    color: "#000000B2",
                  }}
                >
                  {snake.commonName}
                </span>
                <span
                  className="text-stone-400 font-medium select-none"
                  style={{ fontSize: "15px" }}
                >
                  ↔
                </span>
                <Link
                  href={`/snakes/${other.id}`}
                  className="text-sm font-semibold transition-opacity hover:opacity-75"
                  style={{
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: otherIsVenomous ? "#FF7373" : "#CCCCCC",
                    color: "#000000B2",
                  }}
                >
                  {other.commonName}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
