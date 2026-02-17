# Danger Score Rework — Implementation Plan

**Status:** ✅ COMPLETED (2026-02-17)

## Summary

Successfully implemented the new danger scoring system with:
- Log-transformed scoring for LD50 and venom yield
- LD50 normalization to subcutaneous equivalent using family-specific conversion factors
- New component weighting: 45% potency, 30% yield, 25% encounter rate
- Removed subjective aggression and medical access scores
- Special handling for snakes with insufficient data (European Cat Snake, Asian Vine Snake)
- Interactive UI with tooltips explaining the scoring methodology
- Dual-view rankings page: Danger Rankings and Venom Potency Ladder

## Problem Statement

The current danger scoring system relies on hand-assigned values with hardcoded defaults. The `dangerScoreComponents` in `build100Snakes.ts` uses identical values for most snakes (`potencyScore: 70, yieldScore: 70, aggressionScore: 60, encounterScore: 60, medicalScore: 70`), and the `dangerScore` field is a manually assigned number — not computed from the components. Additionally, 21 of 64 venomous snakes have placeholder LD50 values (`1.0`, range `"Varies"`) and no numeric venom yield data.

---

## Phase 1: Fix Underlying Data

### 1.1 Replace Placeholder LD50 and Yield Values

Update the 21 snakes with real values sourced from snakeDB, Wikipedia, PubMed, and published toxicology literature (Brown 1973, Minton 1974).

| Snake | Current LD50 | Real LD50 (mg/kg) | Method | Range | Current Yield | Real Yield (mg) |
|-------|-------------|-------------------|--------|-------|---------------|-----------------|
| Common Krait | 1.0 | 0.325 | SC | 0.089-0.325 | "Moderate" | 10 (8-20) |
| Monocled Cobra | 1.0 | 0.20 | IV | 0.148-0.373 | "Moderate" | 263 |
| Timber Rattlesnake | 1.0 | 1.64 | IV | 1.64-7.7 | "Moderate" | ~140 (est. 75-210) |
| Beaked Sea Snake | 1.0 | 0.1125 | IV | — | "Moderate" | 8 (7.9-9.0) |
| Eastern Green Mamba | 1.0 | 1.3 | SC | 0.45-3.0 | "Moderate" | 75 (60-95) |
| Banded Krait | 1.0 | 2.4 | SC | 0.45-3.6 | "Moderate" | 50 (20-114) |
| Javan Spitting Cobra | 1.0 | 0.9 | IV | 0.59-1.36 | "Moderate" | ~175 (est. from genus) |
| Dugite | 1.0 | 0.66 | SC | 0.56-0.80 | "Moderate" | 6 (max 17) |
| Mulga Snake (King Brown) | 1.0 | 2.38 | SC | 1.91-2.38 | "Moderate" | 150 (up to 1500 milking) |
| Yellow-bellied Sea Snake | 1.0 | 0.067 | SC | 0.04-0.10 | "Moderate" | 2 (1-4, ~0.83/bite) |
| Jararaca | 1.0 | 1.2 | IV | 1.2-3.0 | "Moderate" | 25 (25-26, max 300) |
| South American Rattlesnake | 1.0 | 0.17 | IP | 0.07-0.19 | "Moderate" | 63 (50-76 avg) |
| Horned Desert Viper | 1.0 | 0.40 | IV | 0.40-3.0 | "Moderate" | 23 (19-27, max 100) |
| Southern Boomslang | 1.0 | 0.07 | IV | 0.05-0.10 | "Moderate" | 5 (1.6-8.0) |
| Asp Viper | 1.0 | 1.0 | IV | 1.0-2.0 | "Moderate" | 10 (9-10) |
| Common European Adder | 1.0 | 0.55 | IV | 0.55-6.45 | "Moderate" | 12 (6-18) |
| Nose-horned Viper | 1.0 | 1.2 | IV | 0.44-2.0 | "Moderate" | 20 (15-45) |
| Eastern Massasauga | 1.0 | 0.7 | IP | 0.7-2.5 | "Moderate" | 30 (15-45) |
| Prairie Rattlesnake | 1.0 | 1.55 | IV | 1.55-2.1 | "Moderate" | 50 (20-100) |
| Asian Vine Snake | 1.0 | **No data** | — | — | "Moderate" | **No data** |
| European Cat Snake | 1.0 | **No data** | — | — | "Moderate" | **No data** |

### 1.2 Handle Species With No Toxicology Data

**European Cat Snake** and **Asian Vine Snake** are rear-fanged colubrids with no published LD50 or yield studies. They are medically insignificant.

- Exclude from computed scoring model
- Assign a fixed floor danger score of **5**
- Add `dataQuality: "insufficient"` flag to the `Snake` type
- UI can optionally display "Not enough data to score" instead of a numeric bar

---

## Phase 2: Normalize LD50 Values to a Single Method

### Problem

LD50 values in our dataset use mixed methods (IV, SC, IP). These are not comparable:
- IV (intravenous) → lowest values (venom goes directly to bloodstream)
- IP (intraperitoneal) → middle
- SC (subcutaneous) → highest values (closest to actual snakebite)

### Solution: Normalize Everything to SC

SC is most clinically relevant (approximates real fang injection depth). Apply family-specific conversion factors for snakes with only IV or IP data:

| Conversion | Factor | Rationale |
|-----------|--------|-----------|
| **Elapidae IV → SC** | × 4 | Based on published dual-method data for elapids |
| **Viperidae IV → SC** | × 6 | Based on Vipera berus (IV=0.55, SC=6.45 → 12x) and Cerastes cerastes (IV=0.40, SC=3.0 → 7.5x); using conservative estimate |
| **Colubridae IV → SC** | × 4 | Limited data; use elapid default |
| **IP → SC** | × 2 | Standard approximation from literature |

Store both raw and normalized values:
```ts
interface VenomPotency {
  ld50: number;           // raw value as published
  ld50Range: string;
  unit: string;
  method: "IV" | "SC" | "IM" | "IP";
  ld50Normalized?: number; // normalized to SC equivalent
  normalized?: boolean;    // true if conversion factor was applied
}
```

---

## Phase 3: New Scoring Formula

### 3.1 Drop Aggression and Medical Scores

- **Aggression**: 90% of snakes had identical score (60). No real data source. Removed.
- **Medical access**: Subjective, no sourcing. Removed.

### 3.2 New Weights

| Component | Weight | Data Source |
|-----------|--------|------------|
| Venom potency (LD50) | **45%** | `venomPotency.ld50Normalized` (SC-equivalent) |
| Venom yield | **30%** | `venomYield.dryWeight` or imputed from qualitative |
| Human encounter rate | **25%** | `humanEncounterChance` → numeric mapping |

### 3.3 Log-Transform Scoring (Replace Step Function)

The current `calculatePotencyScore()` uses hardcoded `if/else` brackets, which is a lossy discretization. LD50 spans 4 orders of magnitude (0.025 to 300+ mg/kg) — use logarithmic scaling:

**Potency score** (lower LD50 = higher score):
```
potencyScore = 100 × (1 - (log(ld50_sc) - log(MIN_LD50)) / (log(MAX_LD50) - log(MIN_LD50)))
```

Where `MIN_LD50` = 0.025 (Inland Taipan SC) and `MAX_LD50` = ~300 (Green Vine Snake).

**Yield score** (higher yield = higher score):
```
yieldScore = 100 × (log(yield) - log(MIN_YIELD)) / (log(MAX_YIELD) - log(MIN_YIELD))
```

Where `MIN_YIELD` = 1 mg and `MAX_YIELD` = 600 mg.

Clamp all scores to [0, 100].

### 3.4 Encounter Score Mapping

Map the existing qualitative `humanEncounterChance` labels to numeric values:

| Label | Score |
|-------|-------|
| Low | 20 |
| Moderate | 40 |
| High | 65 |
| Very High | 85 |

### 3.5 Yield Imputation for Missing Numeric Values

For snakes with only `venomYield.qualitative` and no `dryWeight`, derive the imputed value from the **median of snakes that have both numeric and qualitative data in the same bucket**:

| Qualitative Label | Imputed Dry Yield (mg) | Based On |
|---|---|---|
| Extremely High | 400 | Eastern Diamondback (400) |
| High | 250 | Forest Cobra (350), Puff Adder (350), Fer-de-Lance (250), Western Diamondback (250), Bushmaster (200)... |
| Moderate | 85 | Death Adder (70), Indian Cobra (170), Copperhead (85)... |
| Low | 20 | Saw-scaled Viper (20), Mamushi (15), Eyelash (15)... |
| Very Low | 5 | Boomslang (8), Coral Snake (3), Hognose (5) |

Mark imputed values with a flag so they can be distinguished from measured data.

---

## Phase 4: Update Types and Data Model

### 4.1 Update `DangerScoreComponents` in `lib/types.ts`

```ts
interface DangerScoreComponents {
  potencyScore: number;   // 0-100, from log-transformed LD50
  yieldScore: number;     // 0-100, from log-transformed dry yield
  encounterScore: number; // 0-100, from humanEncounterChance mapping
}
// Remove: aggressionScore, medicalScore
```

### 4.2 Add Data Quality Tracking

```ts
interface Snake {
  // ... existing fields ...
  dataQuality?: "measured" | "estimated" | "insufficient";
}
```

---

## Phase 5: Implementation Steps

### Step 1 — Update `lib/types.ts`
- Update `DangerScoreComponents` (remove aggression, medical)
- Add `ld50Normalized` and `normalized` to `VenomPotency`
- Add `dataQuality` to `Snake`

### Step 2 — Rewrite `lib/dangerScore.ts`
- Replace step-function `calculatePotencyScore()` with log-transform
- Replace step-function `calculateYieldScore()` with log-transform
- Add `calculateEncounterScore()` (qualitative → numeric mapping)
- Add `normalizeLD50ToSC()` (family-specific conversion)
- Update `calculateDangerScore()` with new 45/30/25 weights
- Keep `getDangerScoreColor()` and `getDangerScoreBadgeColor()` (no change needed)

### Step 3 — Update `scripts/build100Snakes.ts`
- Replace all 21 placeholder LD50/yield values with real data from Phase 1 table
- Remove hardcoded `dangerScoreComponents` defaults from the `venomous()` helper
- Compute `dangerScore` and `dangerScoreComponents` using the new functions from `dangerScore.ts`
- Set `dataQuality` flag per snake
- Fix European Cat Snake and Asian Vine Snake (fixed floor score, insufficient flag)

### Step 4 — Rebuild Data
- Run `bun run data:build` to regenerate `data/snakes/index.json`
- Verify top 10 / bottom 5 rankings make sense
- Spot-check that known dangerous snakes (Inland Taipan, Black Mamba, Russell's Viper, Saw-scaled Viper) rank appropriately

### Step 5 — UI Adjustments (if needed)
- Update `DangerScoreBar` component if it references removed component names
- Optionally show "Insufficient data" for snakes with `dataQuality: "insufficient"`
- Update any tooltip or breakdown that shows individual component scores

---

## Validation Checklist

After implementation, verify:

- [ ] Inland Taipan has the highest or near-highest danger score (most potent venom + moderate yield)
- [ ] Saw-scaled Viper and Russell's Viper score very high (potent venom + very high encounter rate)
- [ ] Puff Adder scores high (high yield + very high encounters, despite lower potency)
- [ ] Eastern Coral Snake scores moderate (extremely potent but very low yield)
- [ ] Western Hognose and Green Vine Snake score very low (~5-10)
- [ ] Non-venomous snakes remain at 0
- [ ] No snake has a score that feels obviously wrong compared to its real-world danger reputation

---

## Data Sources

- [snakeDB.org — LD50 Database](https://www.snakedb.org/pages/ld50.php)
- [Wikipedia — List of Dangerous Snakes](https://en.wikipedia.org/wiki/List_of_dangerous_snakes)
- Brown JH (1973). *Toxicology and Pharmacology of Venoms from Poisonous Snakes*
- Minton SA (1974). *Venom Diseases*
- WHO/IPCS INCHEM Poisons Information Monographs (PIM series)
- Various PubMed/PMC studies (cited per species in Phase 1 research)
