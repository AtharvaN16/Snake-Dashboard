import type { Snake, ClinicalData, DangerScoreComponents, VenomPotency, VenomYield } from "./types";

// Bounds for log-transform (plan: Inland Taipan SC 0.025, Green Vine ~300)
const MIN_LD50 = 0.025;
const MAX_LD50 = 300;

// Bounds for yield (mg dry weight)
const MIN_YIELD = 1;
const MAX_YIELD = 600;

/** IV→SC ×3 (uniform, literature-supported); IP→SC ×2 */
export function normalizeLD50ToSC(
  ld50: number,
  method: "IV" | "SC" | "IM" | "IP",
  family: string
): { ld50Normalized: number; normalized: boolean } {
  if (method === "SC" || method === "IM") {
    return { ld50Normalized: ld50, normalized: false };
  }
  if (method === "IP") {
    return { ld50Normalized: ld50 * 2, normalized: true };
  }
  // IV → SC: uniform ×3 based on published conversion factors (Broad et al. 1979)
  return { ld50Normalized: ld50 * 3, normalized: true };
}

/**
 * Potency score from SC-equivalent LD50 (log-scale).
 * Lower LD50 = more potent = higher score. Clamped [0, 100].
 */
export function calculatePotencyScore(ld50Sc: number): number {
  const logMin = Math.log(MIN_LD50);
  const logMax = Math.log(MAX_LD50);
  const ld50Clamped = Math.max(MIN_LD50, Math.min(MAX_LD50, ld50Sc));
  const logLd50 = Math.log(ld50Clamped);
  const raw = 100 * (1 - (logLd50 - logMin) / (logMax - logMin));
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Yield score from dry weight (mg). Log-scale. Clamped [0, 100].
 */
export function calculateYieldScore(dryWeightMg: number): number {
  const yieldClamped = Math.max(MIN_YIELD, Math.min(MAX_YIELD, dryWeightMg));
  const logMin = Math.log(MIN_YIELD);
  const logMax = Math.log(MAX_YIELD);
  const raw = 100 * (Math.log(yieldClamped) - logMin) / (logMax - logMin);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** Imputed dry yield (mg) from qualitative label when numeric data missing */
const YIELD_IMPUTED: Record<VenomYield["qualitative"], number> = {
  "Extremely High": 400,
  High: 250,
  Moderate: 85,
  Low: 20,
  "Very Low": 5,
};

export function imputeDryYield(qualitative: VenomYield["qualitative"]): number {
  return YIELD_IMPUTED[qualitative] ?? 85;
}

/**
 * Encounter score from qualitative humanEncounterChance.
 */
export function calculateEncounterScore(
  encounter: Snake["humanEncounterChance"]
): number {
  const map: Record<Snake["humanEncounterChance"], number> = {
    Low: 20,
    Moderate: 40,
    High: 65,
    "Very High": 85,
  };
  return map[encounter] ?? 40;
}

/**
 * Speed score from venomSpeed. Fast-acting venom = more dangerous.
 */
export function calculateSpeedScore(
  speed: Snake["venomSpeed"] | undefined
): number {
  if (!speed) return 40;
  const map: Record<NonNullable<Snake["venomSpeed"]>, number> = {
    "Extremely quick": 90,
    Quick: 55,
    Slow: 20,
  };
  return map[speed] ?? 40;
}

/**
 * Clinical severity score from untreated fatality rate and WHO category.
 * Uses the midpoint of the CFR range on a square-root scale (compresses
 * the top end so 20% CFR still scores meaningfully vs 100%).
 * WHO Category 1 adds a 10-point bonus (capped at 100).
 */
export function calculateClinicalScore(clinical: ClinicalData): number {
  const midCfr = (clinical.untreatedFatalityRate.low + clinical.untreatedFatalityRate.high) / 2;
  const base = Math.sqrt(midCfr / 100) * 100;
  const whoBonus = clinical.whoCategory === 1 ? 10 : 0;
  return Math.round(Math.max(0, Math.min(100, base + whoBonus)));
}

/**
 * Fixed intrinsic weights for the multiplicative danger score model.
 * These do NOT vary by classification — encounter is handled separately
 * as a multiplier, eliminating the circular dependency of the old model.
 *
 * Rationale (compromise between lab precision and clinical relevance):
 * - Potency & Clinical tied at 30%: LD50 is precise but lab-based;
 *   CFR is real-world but imprecise. Equal weight acknowledges both.
 * - Yield at 25%: delivery capacity matters but is partly captured
 *   by clinical outcomes already.
 * - Speed at 15%: affects treatment window but is a secondary factor.
 */
export const INTRINSIC_WEIGHTS = {
  potencyScore: 0.30,
  clinicalScore: 0.30,
  yieldScore: 0.25,
  speedScore: 0.15,
} as const;

/**
 * Encounter base floor for the multiplicative model.
 * A snake that is never encountered retains this fraction of its
 * intrinsic score. At 0.6, encounter can swing the final score by
 * up to ±40% — enough to matter for rankings but not enough to
 * let a harmless, high-encounter snake outrank a deadly, rare one.
 */
export const ENCOUNTER_BASE = 0.6;

/**
 * Multiplicative composite danger score.
 *
 * Model: dangerScore = intrinsic × encounterModifier
 *
 * Where:
 *   intrinsic = Σ (weight_i × score_i)  for potency, clinical, yield, speed
 *   encounterModifier = ENCOUNTER_BASE + (1 - ENCOUNTER_BASE) × (encounterScore / 100)
 *
 * This eliminates the circular dependency of the old additive model where
 * venomClassification determined encounter weight. Encounter now acts as
 * a scaling modifier: it can amplify danger that already exists but cannot
 * create it. A mildly venomous snake scores low regardless of encounter rate.
 */
export function calculateDangerScore(
  components: DangerScoreComponents,
): number {
  const intrinsic =
    components.potencyScore * INTRINSIC_WEIGHTS.potencyScore +
    components.clinicalScore * INTRINSIC_WEIGHTS.clinicalScore +
    components.yieldScore * INTRINSIC_WEIGHTS.yieldScore +
    components.speedScore * INTRINSIC_WEIGHTS.speedScore;

  const encounterModifier =
    ENCOUNTER_BASE + (1 - ENCOUNTER_BASE) * (components.encounterScore / 100);

  const score = intrinsic * encounterModifier;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Returns the intrinsic weights used for the danger score.
 * Encounter is not included here — it's a multiplicative modifier,
 * not an additive segment.
 */
export function getIntrinsicWeights(): typeof INTRINSIC_WEIGHTS {
  return INTRINSIC_WEIGHTS;
}

/**
 * Computes the encounter modifier for a given encounter score.
 * Returns a value in [ENCOUNTER_BASE, 1.0].
 */
export function getEncounterModifier(encounterScore: number): number {
  return ENCOUNTER_BASE + (1 - ENCOUNTER_BASE) * (encounterScore / 100);
}

/**
 * Derive venom classification (the "venomous" tag) from venom potency and
 * yield only. Potency is weighted more than yield so that very potent,
 * low-yield snakes (e.g. Eastern Coral Snake) can be Highly Venomous.
 * Danger score and rankings still use the full formula including clinical
 * severity, encounter rate, and speed.
 */
export function deriveVenomClassification(
  components: DangerScoreComponents
): Snake["venomClassification"] {
  const venomScore =
    components.potencyScore * 0.7 + components.yieldScore * 0.3;
  if (venomScore >= 50) return "Highly Venomous";
  if (venomScore >= 35) return "Venomous";
  if (venomScore >= 12) return "Moderately Venomous";
  if (venomScore >= 5) return "Mildly Venomous";
  return "Non-venomous";
}

/**
 * Compute danger score and components for a single snake.
 * Returns updated snake with dangerScore, dangerScoreComponents,
 * venomPotency.ld50Normalized, and derived venomClassification.
 */
/** Rear-fanged / mild salivary toxins: treat as Mildly Venomous with low danger score */
const mildlyVenomousIds = new Set([
  "garter-snake",
  "hognose-eastern",
  "southern-hognose",
]);

export function computeDangerScoreForSnake(snake: Snake): Snake {
  const insufficientIds = new Set(["european-cat-snake", "asian-vine-snake"]);
  if (snake.dataQuality === "insufficient" || insufficientIds.has(snake.id)) {
    const components: DangerScoreComponents = {
      clinicalScore: 0, potencyScore: 0, yieldScore: 0, encounterScore: 20, speedScore: 0,
    };
    return {
      ...snake,
      dangerScore: calculateDangerScore(components),
      dangerRank: snake.dangerRank,
      dangerScoreComponents: components,
      venomClassification: "Mildly Venomous",
      dataQuality: "insufficient",
    };
  }

  if (mildlyVenomousIds.has(snake.id)) {
    const encounterScore = calculateEncounterScore(snake.humanEncounterChance);
    const components: DangerScoreComponents = {
      clinicalScore: 0,
      potencyScore: 5,
      yieldScore: 5,
      encounterScore,
      speedScore: 20,
    };
    return {
      ...snake,
      dangerScore: calculateDangerScore(components),
      dangerRank: snake.dangerRank,
      dangerScoreComponents: components,
      venomClassification: "Mildly Venomous",
    };
  }

  if (snake.venomClassification === "Non-venomous") {
    return {
      ...snake,
      dangerScore: 0,
      dangerRank: "N/A",
      dangerScoreComponents: undefined,
    };
  }

  const encounterScore = calculateEncounterScore(snake.humanEncounterChance);
  const speedScore = calculateSpeedScore(snake.venomSpeed);

  let potencyScore = 0;
  let ld50Sc = MAX_LD50;
  let potency: VenomPotency | undefined = snake.venomPotency;

  if (snake.venomPotency?.ld50 != null && Number.isFinite(snake.venomPotency.ld50)) {
    const { ld50Normalized, normalized } = normalizeLD50ToSC(
      snake.venomPotency.ld50,
      snake.venomPotency.method,
      snake.family
    );
    ld50Sc = ld50Normalized;
    potencyScore = calculatePotencyScore(ld50Sc);
    potency = {
      ...snake.venomPotency,
      ld50Normalized: ld50Sc,
      normalized,
    };
  }

  let yieldScore = 0;
  const vYield = snake.venomYield;
  const dryMg =
    vYield?.dryWeight ??
    (vYield?.wetVolume != null ? vYield.wetVolume * 200 : null);
  const yieldMg = dryMg ?? (vYield ? imputeDryYield(vYield.qualitative) : 0);
  if (yieldMg > 0) {
    yieldScore = calculateYieldScore(yieldMg);
  }

  let clinicalScore = 0;
  if (snake.clinicalData) {
    clinicalScore = calculateClinicalScore(snake.clinicalData);
  }

  const components: DangerScoreComponents = {
    clinicalScore,
    potencyScore,
    yieldScore,
    encounterScore,
    speedScore,
  };
  const venomClassification = deriveVenomClassification(components);
  const dangerScore = calculateDangerScore(components);

  return {
    ...snake,
    dangerScore,
    dangerRank: snake.dangerRank,
    dangerScoreComponents: components,
    venomClassification,
    ...(potency && { venomPotency: potency }),
  };
}

/**
 * Rank snakes by danger score (desc) and assign dangerRank.
 */
export function rankSnakes(snakes: Snake[]): Snake[] {
  const sorted = [...snakes].sort((a, b) => b.dangerScore - a.dangerScore);
  return sorted.map((snake, index) => ({
    ...snake,
    dangerRank: `${index + 1}/${snakes.length}`,
  }));
}

export function getDangerScoreColor(score: number): string {
  if (score >= 80) return "from-red-600 to-red-500";
  if (score >= 60) return "from-orange-600 to-orange-500";
  if (score >= 40) return "from-yellow-600 to-yellow-500";
  if (score >= 20) return "from-lime-600 to-lime-500";
  return "from-green-600 to-green-500";
}

export function getDangerScoreBadgeColor(score: number): string {
  if (score >= 80) return "bg-red-100 text-red-800 border-red-300";
  if (score >= 60) return "bg-orange-100 text-orange-800 border-orange-300";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (score >= 20) return "bg-lime-100 text-lime-800 border-lime-300";
  return "bg-green-100 text-green-800 border-green-300";
}
