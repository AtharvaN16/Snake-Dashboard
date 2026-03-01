import type { Snake } from "@/lib/types";

// Shared venom classification color mapping for taxonomy tree and legends.
export const venomClassificationColors: Record<Snake["venomClassification"], string> = {
  "Highly Venomous": "#D94A4A",
  "Venomous": "#E8925A",
  "Moderately Venomous": "#D4C43D",
  "Mildly Venomous": "#8FB830",
  "Non-venomous": "#E5E5E5", // Faded so non-venomous nodes recede visually
};

export const venomClassificationOrder: Snake["venomClassification"][] = [
  "Highly Venomous",
  "Venomous",
  "Moderately Venomous",
  "Mildly Venomous",
  "Non-venomous",
];

