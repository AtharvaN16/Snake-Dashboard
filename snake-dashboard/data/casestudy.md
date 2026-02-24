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

## Version 3: The Lethality Model

We replaced the separate potency and yield weights with a single **lethality score** — lethal doses per bite, log-scaled:

```
lethalityScore = log-scaled(yield_mg / (LD50_SC × 70kg))
                 bounds: [0.01, 30] lethal doses → [0, 100] score
```

This reduced the intrinsic model from four components to three:

```
intrinsic = 0.45 × lethality + 0.35 × clinical + 0.20 × speed
encounterModifier = 0.6 + 0.4 × (encounterScore / 100)
dangerScore = intrinsic × encounterModifier
```

This worked well but still had one logical flaw: **Venom speed was acting as a primary danger source.** In an additive model, a harmless snake with "extremely quick" venom could still get 18–20 points added to its score, even if its lethality was zero.

## Version 4: The Risk Multiplier Model

We realized that **Venom Speed is a risk multiplier, not a danger source.** Fast-acting venom makes a deadly snake much more dangerous by narrowing the treatment window, but it doesn't make a harmless snake dangerous.

We moved Speed out of the additive intrinsic core and made it the second multiplicative modifier:

```
baseIntrinsic = 0.55 × lethality + 0.45 × clinical
speedModifier = 0.8 + 0.4 × (speedScore / 100)
encounterModifier = 0.6 + 0.4 × (encounterScore / 100)

dangerScore = (baseIntrinsic × speedModifier) × encounterModifier
```

## Version 5: The Biological Ground Truth

The final refinement addressed two edge cases:
1. **The Mortality Bias:** Some snakes rarely kill but cause permanent disability (amputation, necrosis). 
2. **The Delivery Efficiency:** Rear-fanged snakes are mechanically inefficient compared to vipers and cobras.

### The Morbidity Floor
We introduced a floor for the `clinicalScore` based on qualitative severity to ensure snakes that cause severe disability aren't underscored just because modern medicine prevents death:
- **Severe** (e.g. necrosis risk) → Floor of 35
- **Moderate** → Floor of 15

### The "Chew Factor" (Delivery Modifier)
We added a biological modifier based on `fangType`. Since rear-fanged snakes often require "chewing" to envenomate, they are less efficient.
- **Rule:** If a snake is **Rear-fanged** AND not already classified as Highly Venomous, apply a **0.5x multiplier**.
- This correctly pushes mildly venomous rear-fanged snakes down while leaving deadly exceptions (like the Boomslang) at the top.

### WHO Category Bonus
Recognizing the WHO's assessment of medical importance, we added category bonuses to the clinical score.

### Final Composite Formula

```
baseIntrinsic = 0.55 × lethality + 0.45 × (clinical + floors + WHO bonus)
speedMod      = 0.80 + 0.40 × (speedScore / 100)
deliveryMod   = 0.50 if (rear-fanged AND not highly venomous); else 1.0
encounterMod  = 0.60 + 0.40 × (encounterScore / 100)

dangerScore = ((baseIntrinsic × speedMod) × deliveryMod) × encounterMod
```

### Why These Weights

- **Lethality at 55%**: The primary scientific predictor: "Can one bite kill you?"
- **Clinical at 45%**: The real-world ground truth, now bolstered by **morbidity floors** to account for non-fatal danger.
- **Speed as a ±20% Modifier**: Scales the urgency of treatment.
- **Delivery as a 0.5x Penalty**: Corrects for mechanical inefficiency in non-specialized fangs.
- **Encounter as a 60–100% Modifier**: The final "Real World" frequency filter.

## Version 6: The Epidemiological Risk Model (Current)

After implementing biological ground truths, we addressed final structural issues identified during risk-audit:
1. **Clinical Compression:** Using "Floors" made high-fatality and high-disability snakes look identical.
2. **One-Way Encounter Scaling:** The [0.6 - 1.0] scaling only punished shy snakes but didn't reward the "Public Health Burden" of common ones.
3. **Speed Over-Sensitivity:** Qualitative speed buckets were swinging ranks too wildly at ±20%.

### Parameter Calibrations

- **Fatality vs Morbidity:** Replaced Floors with **Additive Bonuses**. Clinical score now explicitly separates mid-CFR ground truth from permanent disability risk (Morbidity Bonus) and WHO medical importance.
- **Bidirectional Encounter:** Re-centered encounter scaling to **[0.70 to 1.10]**. Rare snakes are penalized (-30%), while very common ones receive a +10% boost to reflect their high epidemiological impact.
- **Narrow Speed Impact:** Reduced speed sensitivity to **±10%** (0.9x to 1.1x).

### Calibrated Composite Formula

```
baseIntrinsic = 0.55 × lethality + 0.45 × (sqrt-CFR + morbidity + WHO bonus)
speedMod      = 0.90 + 0.20 × (speedScore / 100)
deliveryMod   = 0.50 if (rear-fanged AND not highly venomous); else 1.0
encounterMod  = 0.70 + 0.40 × (encounterScore / 100)

dangerScore = round(((baseIntrinsic × speedMod) × deliveryMod) × encounterMod)
```

### Why These Weights

- **Lethality at 55%**: Preserved as the primary scientific predictor.
- **Clinical at 45%**: Refined to prevent compression. A 100% CFR snake now correctly outranks a 10% CFR snake even if both cause "Severe" tissue damage.
- **Encounter [0.7x - 1.1x]**: Restores the balance between "How lethal is it?" and "Will it actually bite a human?" Low-encounter snakes like the Inland Taipan are correctly moderated.

## Final Results

Top rankings with the Version 6 model:

| Rank | Snake | Score | Key Factor |
|---|---|---|---|
| 1 | Russell's Viper | 92 | Highest epidemiological burden + WHO Cat 1 + Very High encounter |
| 2 | Coastal Taipan | 89 | Extreme lethality + extreme speed + proven delivery |
| 3 | Tiger Snake | 88 | Strong core stats across all factors + High encounter |
| 4 | Philippine Cobra | 87 | High clinical ground truth + High encounter |
| 5 | Inland Taipan | 83 | Most lethal venom on Earth, moderated by low encounter (-30%) |
| 6 | Indian Cobra | 81 | Major cause of bites in South Asia + Very High encounter |
| 7 | Puff Adder | 81 | High morbidity (necrotic) + Very High encounter |
| 8 | Monocled Cobra | 80 | High clinical ground truth + High encounter |
| 9 | Common Death Adder | 77 | High lethality + "Extremely Quick" strike/venom |
| 10 | Black Mamba | 75 | 100% CFR + speed multiplier, moderated by Moderate encounter |

Key improvements in Version 6:
- **Epidemiological Realism:** Russell's Viper and Puff Adder move to the top, reflecting their status as the snakes responsible for the most human suffering.
- **Inland Taipan Moderation:** Moved from #1 down to #5, reflecting that while ultra-lethal, its remote habitat lowers its immediate public risk.
- **Fatality Gap Preservation:** Separating fatality and morbidity ensures a 100% CFR snake (Mamba) correctly outranks lower-fatality necrotic snakes in the clinical sub-score.

## What We Learned

1. **Risk Multipliers vs. Danger Sources.** Factors that amplify existing danger (speed, encounter, delivery) should be multipliers. 

2. **Score Disability, not just Death.** Clinical danger is a spectrum. Morbidity bonuses ensure that disability is recognized without erasing the fatality gap.

3. **Bidirectional scaling is more natural.** Encounter shouldn't just be a penalty; it's a risk dimension that can amplify danger when frequency is high.

4. **Self-correcting logic is best.** By tying the delivery penalty to venom classification, the model autonomously handles "deadly" rear-fanged snakes without manual overrides.

## Known Limitations

### The Mouse-to-Human Extrapolation Problem

The `lethalityScore` is derived from LD50 data measured in mice, normalized to a 70kg human using a published subcutaneous conversion factor. This extrapolation assumes venom toxicity scales uniformly from mice to humans — an assumption that breaks down in practice.

**Venom-type sensitivity varies by species:**

- **Neurotoxic venoms** (cobras, mambas, taipans) bind to acetylcholine receptors. Human and mouse acetylcholine receptors are structurally different, and some neurotoxins bind significantly more strongly to human receptors. The mouse LD50 for these venoms can substantially *understate* their danger to humans. The Inland Taipan's theoretical lethal dose model yields ~25 doses per bite for a 70kg human — yet its actual reported lethal capacity in humans is estimated at 100–150, because humans are more sensitive to its particular oxylepitoxin chemistry than mice are.
- **Cytotoxic and hemotoxic venoms** (most vipers) act through enzymatic pathways that are more conserved across mammals. The mouse-to-human extrapolation holds more reliably for these.

This means the `lethalityScore` for neurotoxic elapids may be systematically underestimated relative to hemotoxic vipers — the mouse model penalizes them less than it should.

**The clinical score is a partial correction.** By weighting actual human CFR data at 45%, the model partially corrects for mouse-model biases. A snake whose venom is disproportionately dangerous to humans will show a higher real-world fatality rate in the clinical score. But this correction is only partial — rare snakes with sparse human bite documentation may score low on both axes despite genuinely dangerous venom.

**Practical implication:** The ranking is more accurate than LD50-only rankings, but may still underrank neurotoxic elapid specialists relative to well-documented hemotoxic vipers. The `lethalityScore` and its underlying "lethal doses" derivation should be read as a comparative ranking tool, not as absolute statements of human lethality. The raw LD50 and yield values are objective measurements; the derived score is our model's interpretation of them.

5. **LD50 is a relative, not absolute, truth.** Mouse LD50 is a precise lab measurement but an imperfect human proxy. Its value is in ranking snakes relative to each other, not in claiming biological certainty about human outcomes.

## Formula Reference

```
// Individual component scores (each 0–100)
lethalityScore = log-scaled lethal doses per bite for 70kg human
                 = log-scaled(yield_mg / (LD50_SC × 70))
                 bounds: [0.01, 30] → [0, 100]
clinicalScore  = sqrt-scaled midpoint CFR + morbidity + WHO bonus
                 bonuses: Life-threatening (+20), Severe (+10), Moderate (+5)
                 WHO: Cat 1 (+10), Cat 2 (+5)
speedScore     = qualitative mapping (Extremely quick → 90, Quick → 55, Slow → 20)
encounterScore = qualitative mapping (Low → 20, Moderate → 40, High → 65, Very High → 85)

// Composite score
baseIntrinsic = 0.55 × lethalityScore + 0.45 × clinicalScore
speedMod      = 0.90 + 0.20 × (speedScore / 100)
deliveryMod   = 0.50 if (rear-fanged AND not highly venomous); else 1.0
encounterMod  = 0.70 + 0.40 × (encounterScore / 100)

dangerScore = round(((baseIntrinsic × speedMod) × deliveryMod) × encounterMod)
```
