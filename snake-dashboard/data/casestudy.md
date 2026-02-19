# Danger Score Methodology: A Case Study in Composite Scoring

How we designed, broke, and rebuilt the danger score formula for "Is It Venomous?"

---

## The Goal

Rank 124 snake species by how dangerous they are to humans on a 0–100 scale. The score needs to be defensible, intuitive, and produce rankings that a herpetologist wouldn't laugh at.

## Version 1: The Additive Model

The initial formula was a weighted sum of five factors:

```
dangerScore = 0.30 × encounter + 0.25 × potency + 0.20 × yield + 0.15 × clinical + 0.10 × speed
```

Each component is scored 0–100 individually:

- **Venom Potency**: LD₅₀ (median lethal dose in mice, mg/kg) normalized to subcutaneous equivalent on a log scale. Lower LD₅₀ = more potent = higher score.
- **Venom Yield**: Dry venom weight per bite (mg), log-scaled. Higher yield = higher score.
- **Clinical Severity**: Untreated case fatality rate (CFR) on a square-root scale, with a 10-point bonus for WHO Category 1 species.
- **Human Encounter Rate**: Qualitative mapping (Low → 20, Moderate → 40, High → 65, Very High → 85).
- **Venom Speed**: How quickly symptoms progress (Extremely quick → 90, Quick → 55, Slow → 20).

This worked until we looked at the rankings.

## The Problem: Brown Tree Snake vs. Eastern Coral Snake

The Brown Tree Snake (mildly venomous, rear-fanged, CFR ~0%) was ranking above the Eastern Coral Snake (highly potent neurotoxin, CFR 5–15%). Why? Because the Brown Tree Snake has a "High" encounter rate (encounter score: 65), and encounter was the single largest weight at 30%.

The encounter score was contributing ~19.5 points to the Brown Tree Snake — almost as much as some species' entire danger scores. For a snake that has never killed a human.

## Version 1.5: Classification-Based Encounter Weights

The fix seemed obvious: reduce encounter weight for less dangerous snakes. We derived a `venomClassification` from potency and yield scores, then varied the encounter weight by classification:

| Classification | Encounter Weight |
|---|---|
| Highly Venomous | 30% |
| Venomous | 20% |
| Moderately Venomous | 5% |
| Mildly Venomous | 0% |

When encounter weight decreased, the freed weight was redistributed proportionally to the other four factors. This kept the total at 100%.

This solved the Brown Tree Snake problem. But it introduced three new ones.

### Problem 1: Circular Dependency

The formula now had a feedback loop:

```
potency + yield → deriveVenomClassification() → venomClassification
venomClassification → encounter weight → calculateDangerScore()
```

The classification determines the weights, and the weights determine the score. The formula's shape depends on its own inputs. This is mathematically unsound — a scoring function should have a fixed functional form.

### Problem 2: Discontinuity at Classification Boundaries

The encounter weight jumped in discrete steps. A snake with a venom score of 35.1 ("Venomous", encounter weight = 20%) versus 34.9 ("Moderately Venomous", encounter weight = 5%) got dramatically different treatment. Two nearly identical snakes could produce very different danger scores purely due to an arbitrary threshold.

In data science terms, this is a step function where a continuous function would be appropriate. Step functions create ranking instability — small measurement errors in LD₅₀ or yield data can flip a snake across a classification boundary and cascade into a large score change.

### Problem 3: Perverse Weight Redistribution

When encounter weight dropped for less venomous snakes, the freed weight redistributed to potency and yield — the very factors that were already low (that's why the classification was lower). So the system amplified weight on weak scores, pushing danger scores down further. The model was self-reinforcing in the wrong direction.

## Rethinking the Weights

Before fixing the formula structure, we re-examined what the weights should actually be.

### The Original Ordering Was Wrong

The original weights were: potency (25%) > yield (20%) > clinical (15%) > speed (10%), with encounter (30%) on top. This ordering doesn't reflect how a toxicologist would assess snake danger.

**Clinical severity (untreated fatality rate) is the ground truth.** It's the actual observed outcome of human envenomation. It captures everything LD₅₀ misses:

- Dry bite frequency (some species bite defensively without injecting venom)
- Fang length and venom delivery efficiency
- Venom composition effects in human tissue (not mice)
- Neurotoxic vs. hemotoxic vs. cytotoxic mechanisms

**LD₅₀ is a lab measurement.** It tells you how toxic the venom is per unit weight when injected into mice under controlled conditions. The Inland Taipan has the lowest LD₅₀ of any land snake but causes very few human deaths because of its remote habitat and shy behavior. LD₅₀ is precise but doesn't capture real-world danger.

A snake researcher would weight clinical severity highest.

### The Compromise

We initially proposed:

| Factor | Original | Researcher-Informed |
|---|---|---|
| Clinical severity | 15% (3rd) | 40% (1st) |
| Potency (LD₅₀) | 25% (1st) | 25% (2nd) |
| Yield | 20% (2nd) | 20% (3rd) |
| Speed | 10% (4th) | 15% (4th) |

But weighting clinical at 40% puts the most weight on the least precise data. CFR ranges are broad estimates ("10–20%", "15–30%") — these overlap and come from heterogeneous sources with different treatment access, reporting standards, and sample sizes. LD₅₀, by contrast, is a precise lab measurement.

**The compromise**: clinical and potency both at 30%. Equal footing. This acknowledges that clinical data is the right signal to follow but that its imprecision warrants tempering with precise lab data.

Final intrinsic weights:

| Factor | Weight | Rationale |
|---|---|---|
| Potency | 30% | Precise lab measurement of intrinsic toxicity |
| Clinical | 30% | Real-world outcome data (the ground truth, but imprecise) |
| Yield | 25% | Delivery capacity — partly captured by clinical already |
| Speed | 15% | Treatment window — important but secondary |

## Version 2: The Multiplicative Model

Instead of making encounter an additive component with variable weights, we made it a **multiplicative modifier** on the intrinsic danger score:

```
intrinsicScore = 0.30 × potency + 0.30 × clinical + 0.25 × yield + 0.15 × speed
encounterModifier = 0.6 + 0.4 × (encounterScore / 100)
dangerScore = intrinsicScore × encounterModifier
```

### Why This Works

**Encounter can amplify danger but cannot create it.** A mildly venomous snake with a high encounter rate: low intrinsic (say 8) × high modifier (0.94) = 7.5. A deadly snake with a low encounter rate: high intrinsic (say 75) × low modifier (0.68) = 51. The math naturally prevents the Brown Tree Snake problem without any classification-based branching.

**The base floor (0.6) is the key parameter.** It means a snake that is never encountered still retains 60% of its intrinsic score. A snake encountered very frequently gets up to 100% of its intrinsic score. The encounter modifier swings the score by up to ±40% — enough to differentiate within a tier but not enough to cause cross-tier ranking inversions.

**No circularity.** The weights are fixed constants. The classification is still derived from potency and yield for display purposes but no longer affects the danger score calculation.

**No discontinuities.** The encounter modifier is a continuous, linear function of encounter score. Small changes in inputs produce small changes in output. No classification boundaries, no step functions.

## Results

Key ranking changes (old → new):

| Snake | Old Score | New Score | Why |
|---|---|---|---|
| Black Mamba | 66 (11th) | 61 (7th) | 90–100% CFR now properly weighted |
| Inland Taipan | 66 (10th) | 59 (9th) | Lowest LD₅₀ + 80–100% CFR keeps it high despite low encounter |
| Eastern Coral Snake | — | 27 | Properly above Brown Tree Snake (19) |
| Brown Tree Snake | — | 19 | High encounter can't compensate for near-zero lethality |
| Fer-de-Lance | 68 (8th) | 56 (12th) | Lower CFR (7–15%) now pulls it down appropriately |

The rankings now better reflect what a toxicologist would expect: clinical outcomes and venom potency drive the score, encounter modulates it, and no mathematical tricks are needed to prevent absurd rankings.

## What We Learned

1. **Additive models with variable weights create feedback loops.** If the weights depend on the inputs (or derived quantities), the function is self-referential. Fixed weights with multiplicative modifiers are cleaner.

2. **Step functions in scoring systems create ranking instability.** Continuous functions handle edge cases gracefully. If you need categorical behavior, use a sigmoid — not if/else thresholds.

3. **Weight the outcome, not the predictor.** Clinical severity (CFR) is the actual measure of danger. Lab measurements (LD₅₀) are predictors. The original model weighted predictors more than outcomes.

4. **Precision ≠ importance.** LD₅₀ is more precise than CFR ranges, but precision doesn't determine how much weight a factor deserves. The compromise — equal weight for both — acknowledges this tension.

5. **Multiplicative models are naturally self-correcting.** Multiplication by zero (or near-zero intrinsic score) eliminates the influence of the modifier. No special cases needed for "Mildly Venomous" or "Non-venomous" — the math handles it.

## Formula Reference

```
// Individual component scores (each 0–100)
potencyScore   = log-scaled inverse of SC-normalized LD₅₀
clinicalScore  = sqrt-scaled midpoint CFR + WHO Category 1 bonus
yieldScore     = log-scaled dry venom weight (mg)
speedScore     = qualitative mapping (Extremely quick → 90, Quick → 55, Slow → 20)
encounterScore = qualitative mapping (Low → 20, Moderate → 40, High → 65, Very High → 85)

// Composite score
intrinsic = 0.30 × potencyScore + 0.30 × clinicalScore + 0.25 × yieldScore + 0.15 × speedScore
modifier  = 0.60 + 0.40 × (encounterScore / 100)
dangerScore = round(intrinsic × modifier)    // clamped to [0, 100]
```
