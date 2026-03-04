import type { Snake } from "@/lib/types";

// Shared venom classification color mapping for taxonomy tree and legends.
export const venomClassificationColors: Record<Snake["venomClassification"], string> = {
  "Highly Venomous": "#D94A4A",
  "Venomous": "#E8925A",
  "Moderately Venomous": "#D4C43D",
  "Mildly Venomous": "#8FB830",
  "Non-venomous": "#94a3b8", // Darker gray for better readability while still receding visually
};

export const venomClassificationOrder: Snake["venomClassification"][] = [
  "Highly Venomous",
  "Venomous",
  "Moderately Venomous",
  "Mildly Venomous",
  "Non-venomous",
];

