import type { Snake, ClinicalData, DangerScoreComponents, VenomPotency, VenomYield } from "./types";

// Bounds for log-transform (plan: Inland Taipan SC 0.025, Green Vine ~300)
const MIN_LD50 = 0.025;
const MAX_LD50 = 300;

// Bounds for yield (mg dry weight)
const MIN_YIELD = 1;
const MAX_YIELD = 600;

// Bounds for lethal-doses-per-bite (log scale)
const MIN_LETHAL_DOSES = 0.01;
const MAX_LETHAL_DOSES = 30;
const HUMAN_BODY_WEIGHT_KG = 70;

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
 * Raw lethal doses per bite for a 70kg human.
 */
export function calculateLethalDosesRaw(ld50Sc: number, yieldMg: number): number {
  if (ld50Sc <= 0 || yieldMg <= 0) return 0;
  return yieldMg / (ld50Sc * HUMAN_BODY_WEIGHT_KG);
}

/**
 * Potency score from SC-equivalent LD50 (log-scale).
 * Lower LD50 = more potent = higher score. Clamped [0, 100].
 * Kept for venom classification derivation and display.
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
 * Kept for venom classification derivation and display.
 */
export function calculateYieldScore(dryWeightMg: number): number {
  const yieldClamped = Math.max(MIN_YIELD, Math.min(MAX_YIELD, dryWeightMg));
  const logMin = Math.log(MIN_YIELD);
  const logMax = Math.log(MAX_YIELD);
  const raw = 100 * (Math.log(yieldClamped) - logMin) / (logMax - logMin);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Lethality score: lethal doses per bite for a 70kg human.
 * Combines potency (LD50) and yield into a single interaction metric.
 *
 * lethalDoses = yield_mg / (LD50_SC_mg_per_kg × bodyWeight_kg)
 *
 * This captures the real-world question: "can this snake kill you in one bite?"
 * Log-scaled because the range spans ~3 orders of magnitude.
 * Inland Taipan ≈ 25 doses, Fer-de-Lance ≈ 0.4 doses.
 */
export function calculateLethalityScore(ld50Sc: number, yieldMg: number): number {
  if (ld50Sc <= 0 || yieldMg <= 0) return 0;
  const lethalDoses = yieldMg / (ld50Sc * HUMAN_BODY_WEIGHT_KG);
  const clamped = Math.max(MIN_LETHAL_DOSES, Math.min(MAX_LETHAL_DOSES, lethalDoses));
  const logMin = Math.log(MIN_LETHAL_DOSES);
  const logMax = Math.log(MAX_LETHAL_DOSES);
  const raw = 100 * (Math.log(clamped) - logMin) / (logMax - logMin);
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
 * Disposition score from snake behavior. More aggressive = more dangerous.
 */
export function calculateDispositionScore(
  disposition: Snake["disposition"] | undefined
): number {
  if (!disposition) return 50; // Neutral baseline
  const map: Record<NonNullable<Snake["disposition"]>, number> = {
    Aggressive: 100,
    Defensive: 75,
    Neutral: 50,
    Docile: 25,
    Placid: 0,
  };
  return map[disposition] ?? 50;
}

/**
 * Clinical severity score from untreated fatality rate and WHO category.
 * Uses the midpoint of the CFR range on a square-root scale (compresses
 * the top end so 20% CFR still scores meaningfully vs 100%).
 *
 * Morbidity Bonuses:
 * Replaced floors with additive bonuses to prevent score compression.
 * High-fatality snakes (Mambas) remain at the top, while high-disability
 * snakes (Puff Adders) get a significant boost without hiding the fatality gap.
 */
export function calculateClinicalScore(clinical: ClinicalData): number {
  const midCfr = (clinical.untreatedFatalityRate.low + clinical.untreatedFatalityRate.high) / 2;
  const base = Math.sqrt(midCfr / 100) * 100;
  
  // Additive morbidity bonuses to recognize non-fatal danger
  let morbidityBonus = 0;
  if (clinical.severity === "Life-threatening") morbidityBonus = 20;
  else if (clinical.severity === "Severe") morbidityBonus = 10;
  else if (clinical.severity === "Moderate") morbidityBonus = 5;

  return Math.round(Math.max(0, Math.min(100, base + morbidityBonus)));
}

/**
 * Intrinsic weights for the multiplicative danger score model.
 *
 * The danger score uses two primary intrinsic factors:
 * - Lethality (55%): lethal doses per bite — combines potency and yield
 *   into the toxicologically correct metric of "can this snake kill you?"
 * - Clinical (45%): real-world outcome data (CFR + WHO importance).
 *   The ground truth, but imprecise due to broad estimate ranges.
 *
 * Speed, Encounter, and Delivery are multiplicative modifiers, not additive components.
 * Disposition is folded into the encounter score rather than applied as a separate multiplier.
 */
export const INTRINSIC_WEIGHTS = {
  lethalityScore: 0.55,
  clinicalScore: 0.45,
} as const;

/**
 * Speed base floor for the multiplicative model.
 * A snake with "Slow" venom retains this fraction of its intrinsic score.
 * Slow (20) → ×0.94, Quick (55) → ×1.01, Extremely Quick (90) → ×1.08.
 * This ensures that speed acts as a "risk multiplier": fast venom makes
 * a deadly snake more dangerous, but it doesn't make a harmless snake dangerous.
 */
export const SPEED_BASE = 0.9;

/**
 * Encounter base floor and span for the multiplicative model.
 * After folding disposition in, effectiveEncounterScore ranges [0, 100]:
 *   encounterMod = ENCOUNTER_BASE + ENCOUNTER_SPAN × (effectiveEncounterScore / 100)
 * Range: 0.70× (Placid + Low) to 1.10× (Aggressive + Very High).
 */
export const ENCOUNTER_BASE = 0.70;
export const ENCOUNTER_SPAN = 0.40;

/**
 * Multiplicative composite danger score.
 *
 * Model: dangerScore = baseIntrinsic × speedModifier × encounterModifier × deliveryModifier
 *
 * Where:
 *   baseIntrinsic       = 0.55×lethality + 0.45×clinical
 *   speedModifier       = 0.90 + 0.20 × (speedScore / 100)
 *   effectiveEncounter  = clamp(encounterScore + dispositionAdjustment, 0, 100)
 *   encounterModifier   = 0.70 + 0.40 × (effectiveEncounterScore / 100) [0.70× to 1.10×]
 *   deliveryModifier    = 0.5 if rear-fanged AND not highly venomous; 1.0 otherwise.
 *
 * Disposition is folded into the encounter score: aggressive snakes boost their
 * effective encounter rate; docile/placid snakes reduce it. This captures the
 * "given you meet it, will it bite?" probability without a separate compounding multiplier.
 *
 * The score has no upper cap — it is a relative index, not a percentage.
 */
export function calculateDangerScore(
  components: DangerScoreComponents,
  deliveryModifier: number = 1.0
): number {
  const baseIntrinsic =
    components.lethalityScore * INTRINSIC_WEIGHTS.lethalityScore +
    components.clinicalScore * INTRINSIC_WEIGHTS.clinicalScore;

  const speedModifier = getSpeedModifier(components.speedScore);
  const effectiveEncounterScore = getEffectiveEncounterScore(components.encounterScore, components.dispositionScore);
  const encounterModifier = getEncounterModifier(effectiveEncounterScore);

  const score = baseIntrinsic * speedModifier * encounterModifier * deliveryModifier;
  return Math.round(Math.max(0, score));
}

/**
 * Returns the intrinsic weights used for the danger score.
 */
export function getIntrinsicWeights(): typeof INTRINSIC_WEIGHTS {
  return INTRINSIC_WEIGHTS;
}

/**
 * Computes the speed modifier for a given speed score.
 * Returns a value in [SPEED_BASE, SPEED_BASE + 0.2].
 * 100 -> 1.1 (+10% bonus for extremely fast)
 * 50 -> 1.0 (neutral)
 * 0 -> 0.9 (-10% penalty for slow)
 */
export function getSpeedModifier(speedScore: number): number {
  return SPEED_BASE + (0.2 * speedScore) / 100;
}

/**
 * Computes the encounter modifier for a given encounter score.
 * Returns a value in [ENCOUNTER_BASE, ENCOUNTER_BASE + ENCOUNTER_SPAN].
 */
export function getEncounterModifier(encounterScore: number): number {
  return ENCOUNTER_BASE + ENCOUNTER_SPAN * (encounterScore / 100);
}

/**
 * Folds disposition into the encounter score rather than applying it as a
 * separate multiplier. Disposition adjusts how likely a snake is to bite
 * when encountered — "given you meet it, will it strike?"
 *
 * Adjustment scale is asymmetric (0.4 below neutral, 0.3 above) so that
 * extremely passive snakes are meaningfully moderated without over-rewarding aggression.
 *
 * Resulting adjustments at each disposition label:
 *   Aggressive (100) → +15   Defensive (75) → +7.5
 *   Neutral (50)     →   0   Docile (25)    → −10   Placid (0) → −20
 *
 * The effective encounter score is clamped to [0, 100], which also makes
 * the encounter modifier's full range [0.70, 1.10] reachable in practice:
 *   Aggressive + Very High → effectiveScore 100 → encounterMod 1.10
 *   Placid + Low           → effectiveScore   0 → encounterMod 0.70
 */
export function getEffectiveEncounterScore(encounterScore: number, dispositionScore: number): number {
  const scale = dispositionScore >= 50 ? 0.3 : 0.4;
  const adjustment = (dispositionScore - 50) * scale;
  return Math.max(0, Math.min(100, encounterScore + adjustment));
}

/**
 * Returns rounded contribution values for danger score display (e.g. tooltips).
 * Waterfall order: lethality + clinical → speed adjustment → delivery adjustment → encounter adjustment.
 * Disposition is folded into encounter and not shown as a separate step.
 */
export function getDangerScoreBreakdown(
  components: DangerScoreComponents,
  _dangerScore: number,
  deliveryModifier: number = 1.0
): { lethality: number; clinical: number; speed: number; delivery: number; encounter: number } {
  const weights = getIntrinsicWeights();
  const lethality = Math.round(components.lethalityScore * weights.lethalityScore);
  const clinical = Math.round(components.clinicalScore * weights.clinicalScore);

  const base = lethality + clinical;
  const speedMod = getSpeedModifier(components.speedScore);
  const effectiveEncounterScore = getEffectiveEncounterScore(components.encounterScore, components.dispositionScore);
  const encounterMod = getEncounterModifier(effectiveEncounterScore);

  const speedEffect = Math.round(base * (speedMod - 1));
  const afterSpeed = base + speedEffect;

  const deliveryEffect = Math.round(afterSpeed * (deliveryModifier - 1));
  const afterDelivery = afterSpeed + deliveryEffect;

  const encounterEffect = Math.round(afterDelivery * (encounterMod - 1));

  return {
    lethality,
    clinical,
    speed: speedEffect,
    delivery: deliveryEffect,
    encounter: encounterEffect
  };
}

/**
 * Derive venom classification from potency and yield scores.
 * Potency is weighted more than yield so that very potent, low-yield
 * snakes (e.g. Eastern Coral Snake) can be Highly Venomous.
 */
function deriveBaseClassification(
  potencyScore: number,
  yieldScore: number
): Snake["venomClassification"] {
  const venomScore = potencyScore * 0.7 + yieldScore * 0.3;
  if (venomScore >= 50) return "Highly Venomous";
  if (venomScore >= 35) return "Venomous";
  if (venomScore >= 12) return "Moderately Venomous";
  if (venomScore >= 5) return "Mildly Venomous";
  return "Non-venomous";
}

/**
 * Derive venom classification with clinical gate.
 * Base classification uses potency + yield, then a clinical gate
 * caps at "Venomous" if untreated CFR midpoint < 5%.
 *
 * This prevents misleading labels like "Highly Venomous" on snakes
 * with potent venom but near-zero fatality rates (e.g. Common European Adder).
 */
export function deriveVenomClassification(
  components: DangerScoreComponents,
  clinicalData?: ClinicalData
): Snake["venomClassification"] {
  const base = deriveBaseClassification(components.potencyScore, components.yieldScore);

  if (base === "Highly Venomous" && clinicalData) {
    const midCfr =
      (clinicalData.untreatedFatalityRate.low + clinicalData.untreatedFatalityRate.high) / 2;
    if (midCfr < 5) return "Venomous";
  }

  return base;
}

/**
 * Computes the delivery efficiency modifier (The "Chew Factor").
 *
 * Rear-fanged snakes (Colubrids) are less efficient at envenomating.
 * If their venom is already "Moderately Venomous" or lower, their
 * inefficiency further reduces their clinical danger by 50%.
 *
 * Exception: Highly Venomous rear-fanged snakes (e.g. Boomslang)
 * are efficient enough that their lab lethality translates
 * directly to clinical harm.
 */
export function getDeliveryModifier(
  fangType: Snake["fangType"] | undefined,
  classification: Snake["venomClassification"]
): number {
  if (fangType !== "Rear fangs") return 1.0;
  
  // If highly venomous, don't punish delivery - its lethality is proven
  if (classification === "Highly Venomous" || classification === "Venomous") {
    return 1.0;
  }
  
  // Moderate / Mild / Non-venomous rear-fanged snakes are inefficient
  return 0.5;
}

/**
 * Compute danger score and components for a single snake.
 * Returns updated snake with dangerScore, dangerScoreComponents,
 * venomPotency.ld50Normalized, and derived venomClassification.
 */
export function computeDangerScoreForSnake(snake: Snake): Snake {
  // 1. Base check for non-venomous
  // Skip early return if it's a large constrictor that needs a minimum score
  const isLargeConstrictor = 
    snake.constrictor && 
    snake.maxLength && 
    snake.maxLength.value >= 3 && 
    snake.maxLength.unit === "m";

  if (snake.venomClassification === "Non-venomous" && !snake.clinicalData && !isLargeConstrictor) {
    return {
      ...snake,
      dangerScore: 0,
      dangerRank: "N/A",
      dangerScoreComponents: undefined,
    };
  }

  // 2. Data Quality / Insufficient handling
  if (snake.dataQuality === "insufficient") {
    const components: DangerScoreComponents = {
      clinicalScore: 0, potencyScore: 0, yieldScore: 0,
      lethalityScore: 0, encounterScore: 20, speedScore: 0,
      dispositionScore: 50,
    };
    return {
      ...snake,
      dangerScore: calculateDangerScore(components),
      dangerScoreComponents: components,
      venomClassification: "Mildly Venomous",
      dataQuality: "insufficient",
    };
  }

  // 3. Components
  const encounterScore = calculateEncounterScore(snake.humanEncounterChance);
  const speedScore = calculateSpeedScore(snake.venomSpeed);
  const dispositionScore = calculateDispositionScore(snake.disposition);

  // 3a. Potency (Normalize to SC equivalent)
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

  // 3b. Yield (Impute if missing)
  let yieldScore = 0;
  const vYield = snake.venomYield;
  const dryMg =
    vYield?.dryWeight ??
    (vYield?.wetVolume != null ? vYield.wetVolume * 200 : null);
  const yieldMg = dryMg ?? (vYield ? imputeDryYield(vYield.qualitative) : 0);
  if (yieldMg > 0) {
    yieldScore = calculateYieldScore(yieldMg);
  }

  // 3c. Lethality (Interaction of Potency & Yield)
  const lethalityScore = calculateLethalityScore(ld50Sc, yieldMg);

  // 3d. Clinical (Ground truth outcome)
  let clinicalScore = 0;
  if (snake.clinicalData) {
    clinicalScore = calculateClinicalScore(snake.clinicalData);
  }

  const components: DangerScoreComponents = {
    clinicalScore,
    potencyScore,
    yieldScore,
    lethalityScore,
    encounterScore,
    speedScore,
    dispositionScore,
  };

  // 4. Derive Labels & Modifiers
  const venomClassification = deriveVenomClassification(components, snake.clinicalData);
  const deliveryModifier = getDeliveryModifier(snake.fangType, venomClassification);

  // 5. Compute Final Score
  let dangerScore = calculateDangerScore(components, deliveryModifier);

  // 6. Handle Large Constrictors
  // Even if non-venomous, large snakes (>= 3m) pose a physical danger (trauma/constriction)
  // and shouldn't be dismissed with a 0 score.
  if (isLargeConstrictor) {
    dangerScore = Math.max(dangerScore, 5);
  }

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
