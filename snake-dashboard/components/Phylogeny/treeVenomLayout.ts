import * as d3 from "d3";
import type { Snake } from "@/lib/types";
import { MAX_POTENCY_EXTENSION } from "./treeConstants";

/**
 * Radial extension (tree units) for a species node based on potency score.
 * Score 0 → 0 extension; score 100 → MAX_POTENCY_EXTENSION.
 */
export function getPotencyExtension(snake: Snake | undefined): number {
  const score = snake?.dangerScoreComponents?.potencyScore ?? 0;
  const t = score / 100;
  // Quadratic curve amplifies top-end differences: Inland Taipan (100) vs King Cobra (43)
  // becomes 100% vs 18% of MAX_POTENCY_EXTENSION instead of 100% vs 43%.
  return Math.pow(t, 2) * MAX_POTENCY_EXTENSION;
}

/**
 * Circle radius for a species node based on yield score.
 * Score 0 → 0.6× base; score 100 → 3.0× base.
 */
export function getYieldRadius(snake: Snake | undefined, baseRadius: number): number {
  const score = snake?.dangerScoreComponents?.yieldScore ?? 0;
  const scale = 0.6 + (score / 100) * 2.4;
  return baseRadius * scale;
}

/** Sequential color scale: low potency = soft pink, high potency = deep purple. */
export const potencyColorScale = d3
  .scaleSequential<string>()
  .domain([0, 100])
  .interpolator(d3.interpolateRgb("#ff9a9e", "#6a0572"));

/** Color for a potency score [0–100]. */
export function getPotencyColor(potencyScore: number): string {
  return potencyColorScale(potencyScore);
}

/** True when the snake produces venom (i.e. not Non-venomous). */
export function isVenomous(snake: Snake | undefined): boolean {
  return snake?.venomClassification !== "Non-venomous";
}
