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

### The Precision vs. Importance Tension

We initially proposed clinical at 40%, but this puts the most weight on the least precise data. CFR ranges are broad estimates ("10–20%", "15–30%") — these overlap and come from heterogeneous sources with different treatment access, reporting standards, and sample sizes. LD₅₀, by contrast, is a precise lab measurement.

This led to a key insight: precision and importance are different axes. Clinical data is the most important signal but the least precise measurement. We needed a way to respect both.

## Version 2: The Multiplicative Model

Instead of making encounter an additive component with variable weights, we made it a **multiplicative modifier** on the intrinsic danger score:

```
intrinsicScore = 0.30 × potency + 0.30 × clinical + 0.25 × yield + 0.15 × speed
encounterModifier = 0.6 + 0.4 × (encounterScore / 100)
dangerScore = intrinsicScore × encounterModifier
```

This eliminated the circular dependency and discontinuities — encounter amplifies danger but cannot create it.

But when we audited the rankings, a new problem emerged.

### The Interaction Problem: Potency and Yield Are Not Independent

Scoring potency and yield separately ignores that real-world lethality is their interaction. What determines whether a bite can kill is **lethal doses per bite**:

```
lethalDoses = yield_mg / (LD50_SC × bodyWeight_kg)
```

Consider these two snakes:

| Snake | LD₅₀ (SC) | Yield | Lethal Doses (70kg human) |
|---|---|---|---|
| Eastern Brown Snake | 0.037 | 5mg | **1.9** |
| Fer-de-Lance | 8.4 | 250mg | **0.43** |

The Eastern Brown delivers nearly 2 lethal doses per bite. The Fer-de-Lance can't reliably deliver even one. Yet in v2, the Fer-de-Lance's massive yield score (250mg) pushed it above the Eastern Brown in rankings. Scoring the factors independently meant a snake could score high on yield alone even when the combination of potency and yield means it can't kill you.

## Version 3: The Lethality Model (Current)

We replaced the separate potency and yield weights with a single **lethality score** — lethal doses per bite, log-scaled:

```
lethalityScore = log-scaled(yield_mg / (LD50_SC × 70kg))
                 bounds: [0.01, 30] lethal doses → [0, 100] score
```

This reduces the intrinsic model from four components to three:

```
intrinsic = 0.45 × lethality + 0.35 × clinical + 0.20 × speed
encounterModifier = 0.6 + 0.4 × (encounterScore / 100)
dangerScore = intrinsic × encounterModifier
```

### Why These Weights

- **Lethality at 45%**: This replaces what was 55% combined (potency 30% + yield 25%) but better captures the interaction. It answers the fundamental question: "can one bite kill you?"
- **Clinical at 35%**: Elevated from 30%. CFR is the ground truth — it validates whether the lethality score's theoretical danger translates to real-world deaths. Clinical and lethality together (80%) dominate the score, as they should.
- **Speed at 20%**: Elevated from 15%. With fewer components, each needs more weight to be meaningful. Speed determines whether you have time to reach a hospital.

### The Clinical Gate

We also fixed a classification problem. The venom classification label ("Highly Venomous", etc.) was derived from potency and yield only. This led to misleading labels — the Common European Adder was classified "Highly Venomous" despite a 0–1% CFR.

The fix: a **clinical gate** that caps classification at "Venomous" if the untreated CFR midpoint is below 5%. The venom may be biochemically potent, but if the snake almost never kills, "Highly Venomous" is misleading to users.

## Final Results

Top 15 rankings with the lethality model:

| Rank | Snake | Score | Lethal Doses | CFR | Key Factor |
|---|---|---|---|---|---|
| 1 | Russell's Viper | 70 | 4.8 | 30–70% | High lethality + very high encounter + WHO Cat 1 |
| 2 | Coastal Taipan | 70 | 7.1 | 60–80% | Extreme lethality + extremely fast venom |
| 3 | Philippine Cobra | 69 | 3.1 | 50–70% | High clinical + fast venom + high encounter |
| 4 | Tiger Snake | 66 | 3.3 | 40–60% | Strong across all factors |
| 5 | Puff Adder | 65 | 4.2 | 10–20% | Massive yield + very high encounter + fast venom |
| 6 | Inland Taipan | 65 | **25.1** | 80–100% | Most lethal venom on Earth, limited by low encounter |
| 7 | Black Mamba | 63 | 1.8 | **90–100%** | Highest CFR, boosted by clinical weight |
| 8 | Indian Cobra | 61 | 2.8 | 20–40% | Very high encounter in densely populated regions |

Key improvements over v2:
- **Inland Taipan** rose from #9 to #6 — its 25 lethal doses per bite are now properly captured
- **Eastern Brown** (#14) now above **Fer-de-Lance** (#16) — 1.9 lethal doses > 0.43
- **Brown Tree Snake** (DS=6) far below **Eastern Coral Snake** (DS=20) — original problem fully solved
- **Common European Adder** reclassified from "Highly Venomous" to "Venomous" — clinical gate prevents misleading labels

## What We Learned

1. **Additive models with variable weights create feedback loops.** If the weights depend on the inputs (or derived quantities), the function is self-referential. Fixed weights with multiplicative modifiers are cleaner.

2. **Step functions in scoring systems create ranking instability.** Continuous functions handle edge cases gracefully. If you need categorical behavior, use a sigmoid — not if/else thresholds.

3. **Score interacting factors together, not independently.** Potency and yield are not independent predictors of danger — they interact multiplicatively (lethal doses = yield / lethal dose). Scoring them separately allows one to compensate for the other, producing misleading results.

4. **Weight the outcome, not the predictor.** Clinical severity (CFR) is the actual measure of danger. Lab measurements (LD₅₀) are predictors. The original model weighted predictors more than outcomes.

5. **Precision ≠ importance.** LD₅₀ is more precise than CFR ranges, but precision doesn't determine how much weight a factor deserves. The lethality metric (which uses LD₅₀) gets the highest weight (45%) partly because it's more precise and partly because it answers the most important question directly.

6. **Labels should match user expectations.** "Highly Venomous" means "this will kill you" to most people, not "this venom is biochemically potent." A clinical gate ensures the label reflects real-world danger, not just lab toxicology.

7. **Multiplicative models are naturally self-correcting.** Multiplication by zero (or near-zero intrinsic score) eliminates the influence of the modifier. No special cases needed for mildly venomous or non-venomous species.

## Formula Reference

```
// Individual component scores (each 0–100)
lethalityScore = log-scaled lethal doses per bite for 70kg human
                 = log-scaled(yield_mg / (LD50_SC × 70))
                 bounds: [0.01, 30] → [0, 100]
clinicalScore  = sqrt-scaled midpoint CFR + WHO Category 1 bonus (+10)
speedScore     = qualitative mapping (Extremely quick → 90, Quick → 55, Slow → 20)
encounterScore = qualitative mapping (Low → 20, Moderate → 40, High → 65, Very High → 85)

// Composite score
intrinsic = 0.45 × lethalityScore + 0.35 × clinicalScore + 0.20 × speedScore
modifier  = 0.60 + 0.40 × (encounterScore / 100)
dangerScore = round(intrinsic × modifier)    // clamped to [0, 100]

// Venom classification (for display labels)
venomScore = 0.70 × potencyScore + 0.30 × yieldScore
classification = threshold-based (≥50 Highly Venomous, ≥35 Venomous, ≥12 Moderately, ≥5 Mildly)
clinicalGate: if "Highly Venomous" but CFR midpoint < 5%, downgrade to "Venomous"
```
