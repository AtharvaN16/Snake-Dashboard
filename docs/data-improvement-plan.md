# Data Improvement Plan: Danger Score & Classification Fix

## STATUS: IMPLEMENTED (2026-02-17)

All scoring/classification steps have been completed. The Gaboon Viper is now correctly classified as "Highly Venomous" (DS=51, clinical=57).

### What was done:
- Fixed bug: `deriveVenomClassification()` now receives components, not a number
- Fixed bug: `clinicalScore` is now computed and included in components
- Added `clinicalFixes` map with clinical data for all 64 venomous snakes
- Reduced LD50 normalization from ×6/×4 to uniform ×3 for all families
- Updated danger score weights: Clinical 30%, Potency 20%, Yield 20%, Encounters 20%, Speed 10%
- Updated DangerScoreSegmentedBar to show 5 segments with correct weights
- Updated DangerScoreTooltip to show 5 factors
- Regenerated data/snakes/index.json

### Files modified:
- `snake-dashboard/lib/dangerScore.ts`
- `snake-dashboard/scripts/build100Snakes.ts`
- `snake-dashboard/components/DangerScoreSegmentedBar.tsx`
- `snake-dashboard/components/DangerScoreTooltip.tsx`
- `snake-dashboard/data/snakes/index.json` (regenerated)

### Pre-existing issue (unrelated):
- `bun run build` fails due to missing `@types/d3` in `PhylogenyChart.tsx` — not caused by these changes

---

## Data Validation & Quality Audit

### How to validate the data

#### 1. Run the build and check for errors
```bash
cd snake-dashboard
bun run data:build       # Should output "Wrote 124 snakes"
bun run build            # TypeScript compilation (note: d3 types issue is pre-existing)
bun run dev              # Visual check at localhost:3000
```

#### 2. Automated sanity checks (run after any data change)
```bash
# Check all venomous snakes have clinical data
python3 << 'EOF'
import json, sys
with open('data/snakes/index.json') as f:
    data = json.load(f)
errors = []
for s in data['snakes']:
    sid = s['id']
    vc = s['venomClassification']
    # Every venomous snake should have clinicalData
    if vc != 'Non-venomous' and not s.get('clinicalData'):
        errors.append(f"  MISSING clinicalData: {sid} ({vc})")
    # Every venomous snake should have dangerScoreComponents with clinicalScore
    comp = s.get('dangerScoreComponents', {})
    if vc != 'Non-venomous' and 'clinicalScore' not in comp:
        errors.append(f"  MISSING clinicalScore in components: {sid}")
    # Check for placeholder attributions
    attr = s.get('images', {}).get('attribution', {})
    if attr.get('source') == 'Placeholder':
        errors.append(f"  PLACEHOLDER image attribution: {sid}")
    # Check for LD50 = 1 with N/A range (known placeholder)
    pot = s.get('venomPotency', {})
    if pot.get('ld50') == 1 and pot.get('ld50Range') == 'N/A':
        errors.append(f"  PLACEHOLDER LD50 data: {sid} (ld50=1, range=N/A)")
    # Check dangerScore is within bounds
    ds = s.get('dangerScore', -1)
    if ds < 0 or ds > 100:
        errors.append(f"  OUT OF BOUNDS dangerScore={ds}: {sid}")
if errors:
    print(f"FOUND {len(errors)} issues:")
    for e in errors: print(e)
    sys.exit(1)
else:
    print("All 124 snakes pass validation.")
EOF
```

#### 3. Classification spot-checks
After any algorithm or data change, verify these known edge cases produce sensible results:

| Snake | Expected Classification | Why |
|-------|------------------------|-----|
| Gaboon Viper | Highly Venomous | 600mg yield, 15-30% untreated CFR, WHO Cat 1 |
| Inland Taipan | Highly Venomous | Most potent venom, 80-100% untreated CFR |
| Black Mamba | Highly Venomous | 90-100% untreated CFR, fast-acting |
| Copperhead | Moderately Venomous | Near-zero fatality rate, no WHO category |
| Western Hognose | Mildly Venomous | Negligible venom, zero fatality |
| Boomslang | Highly Venomous | 30-50% untreated CFR, WHO Cat 1 |
| Night Adder | Moderately Venomous | 0-1% fatality, no WHO category |

#### 4. Full ranking review
```bash
# Print top 20 and bottom 10 venomous snakes to check ranking makes sense
python3 << 'EOF'
import json
with open('data/snakes/index.json') as f:
    data = json.load(f)
venomous = [s for s in data['snakes'] if s['venomClassification'] != 'Non-venomous']
venomous.sort(key=lambda s: s['dangerScore'], reverse=True)
print("=== TOP 20 ===")
for i, s in enumerate(venomous[:20], 1):
    comp = s.get('dangerScoreComponents', {})
    print(f"  {i:2d}. {s['commonName']:35s} DS={s['dangerScore']:3d}  {s['venomClassification']:25s}  clin={comp.get('clinicalScore','?'):>3}  pot={comp.get('potencyScore','?'):>3}  yield={comp.get('yieldScore','?'):>3}")
print("\n=== BOTTOM 10 ===")
for s in venomous[-10:]:
    comp = s.get('dangerScoreComponents', {})
    print(f"      {s['commonName']:35s} DS={s['dangerScore']:3d}  {s['venomClassification']:25s}  clin={comp.get('clinicalScore','?'):>3}  pot={comp.get('potencyScore','?'):>3}  yield={comp.get('yieldScore','?'):>3}")
EOF
```

#### 5. Image validation
```bash
# Check which snakes have missing images
bun run images:validate
```

---

## Known Data Quality Issues

### CRITICAL: Missing images (2 snakes)
| Snake ID | Issue |
|----------|-------|
| `carpet-viper` | No image directory at `public/images/snakes/carpet-viper/`. Attribution = "Placeholder". |
| `indigo-snake` | No image directory at `public/images/snakes/indigo-snake/`. Attribution = "Placeholder". |

**Fix:** Run `bun run images:process` for these snakes, or manually add images and `attribution.json`.

**Root cause:** `scripts/build100Snakes.ts` line 23 has a fallback that returns `{ source: "Placeholder", license: "CC BY 4.0", url: "https://placeholder.com" }` when `attribution.json` is missing.

### FLAGGED: Insufficient venom data (2 snakes)
| Snake ID | Issue |
|----------|-------|
| `asian-vine-snake` | LD50 = 1.0 with range "N/A" — placeholder, no real data. Marked `dataQuality: "insufficient"`. |
| `european-cat-snake` | LD50 = 1.0 with range "N/A" — placeholder, no real data. Marked `dataQuality: "insufficient"`. |

**Context:** Both are rear-fanged colubrids with medically insignificant venom. The LD50 of 1.0 is a made-up number. These snakes are correctly classified as "Mildly Venomous" with DS=5 (hardcoded for insufficient data).

**Fix options:**
1. Research actual LD50 values if published studies exist (unlikely for these species)
2. Add a UI indicator (e.g., "Venom data unavailable — medically insignificant") instead of showing fake numbers
3. Leave as-is with `dataQuality: "insufficient"` flag (current approach)

### FLAGGED: Estimated data quality (2 snakes)
| Snake ID | Issue |
|----------|-------|
| `timber-rattlesnake` | LD50 range 1.64-7.7 is very wide, marked `dataQuality: "estimated"` |
| `javan-spitting-cobra` | LD50 0.59-1.36, marked `dataQuality: "estimated"` |

**Fix:** These are reasonable estimates but should be verified against primary sources. The wide range for timber rattlesnake reflects genuine variability across populations (Crotalus horridus has significant geographic variation in venom composition).

### MINOR: Generic symptom descriptions (2 snakes)
| Snake ID | Issue |
|----------|-------|
| `asian-vine-snake` | Symptoms are generic template text, not species-specific |
| `european-cat-snake` | Same generic template as asian-vine-snake |

**Fix:** Replace with species-specific symptom descriptions or remove entirely for medically insignificant species.

### NOT AN ISSUE: Round yield numbers
Some snakes have round yield values (50mg, 150mg, 200mg). These are consistent with published literature — venom yield is typically reported as rounded averages from multiple specimens.

### NOT AN ISSUE: Missing clinicalData on non-venomous snakes
60 non-venomous snakes have no `clinicalData` field. This is correct — they have no venom to report on.

---

## Original Plan (for reference)

## Problem Statement

The Gaboon Viper (600mg yield, longest fangs, lethal untreated, WHO Cat 1) is classified "Moderately Venomous" instead of "Highly Venomous." This is caused by three bugs and missing data, not bad formula weights.

## Bugs Found

### Bug 1: Classification receives wrong argument
**File:** `snake-dashboard/lib/dangerScore.ts`, line 209
```typescript
// BROKEN: passes a number instead of DangerScoreComponents
const venomClassification = deriveVenomClassification(dangerScore);
// FIX:
const venomClassification = deriveVenomClassification(components);
```

### Bug 2: clinicalScore never computed
**File:** `snake-dashboard/lib/dangerScore.ts`, lines 202-207
The `DangerScoreComponents` interface requires `clinicalScore` but it's never calculated or included in the components object. Fix: compute it from `snake.clinicalData` before building components.

### Bug 3: No clinical data in dataset
The `clinicalData` field exists in `lib/types.ts` but zero snakes have it populated. The `calculateClinicalScore()` function exists (line 104) but is never called.

### Bug 4: LD50 normalization ×6 for Viperidae is too aggressive
**File:** `snake-dashboard/lib/dangerScore.ts`, line 26
Literature supports ×2-4 for IV→SC conversion. Current ×6 over-penalizes vipers. Change all families to ×3.

## UI Sync Issues

### DangerScoreTooltip shows wrong weights
**File:** `snake-dashboard/components/DangerScoreTooltip.tsx`
Shows 4 factors (Potency 40%, Yield 25%, Encounters 20%, Speed 15%) but algorithm has 5 factors including clinical.

### DangerScoreSegmentedBar missing clinical segment
**File:** `snake-dashboard/components/DangerScoreSegmentedBar.tsx`
Only shows 4 segments. Needs 5th segment for clinical severity.

---

## Implementation Steps

### Step 1: Fix bugs in `lib/dangerScore.ts`

1. In `computeDangerScoreForSnake()` (line 148), add clinical score computation before building components:
```typescript
let clinicalScore = 0;
if (snake.clinicalData) {
  clinicalScore = calculateClinicalScore(snake.clinicalData);
}

const components: DangerScoreComponents = {
  clinicalScore,    // ADD THIS
  potencyScore,
  yieldScore,
  encounterScore,
  speedScore,
};
const dangerScore = calculateDangerScore(components);
const venomClassification = deriveVenomClassification(components); // FIX: was passing dangerScore (a number)
```

2. Fix LD50 normalization (line 25-28):
```typescript
// Change all IV→SC multipliers to ×3
return { ld50Normalized: ld50 * 3, normalized: true };
```

3. Update the `insufficientIds` early return (line 155) to include `clinicalScore: 0` in components.

### Step 2: Adjust danger score weights in `calculateDangerScore()`

```typescript
const score =
  components.clinicalScore * 0.30 +    // 30% (unchanged)
  components.potencyScore * 0.20 +     // 20% (unchanged)
  components.yieldScore * 0.20 +       // 20% (unchanged)
  components.encounterScore * 0.20 +   // 20% (was 15%, epidemiologically important)
  components.speedScore * 0.10;        // 10% (was 15%, least impactful)
```

### Step 3: Keep classification formula as-is
The existing classification weights (Clinical 40%, Potency 30%, Yield 30%) with ≥50 threshold work correctly once bugs are fixed and clinical data is populated.

### Step 4: Add clinical data via `clinicalFixes` map in `scripts/build100Snakes.ts`
Added a `clinicalFixes` record keyed by snake ID, applied during the correction pipeline (alongside `dataFixes`). This covers all 64 venomous snakes without changing the `venomous()` function signature.

### Step 5: Update UI Components
- `DangerScoreSegmentedBar.tsx`: Added clinicalScore segment, updated all 5 weights
- `DangerScoreTooltip.tsx`: Updated to show 5 factors with correct weights

### Step 6: Regenerate Data
```bash
bun run data:build
```

---

## Notes for Continuing Agent

- The `calculateClinicalScore()` function already exists and works — it just needs to be called
- The `ClinicalData` interface in `types.ts` is already correct — no changes needed
- The `DangerScoreComponents` interface already includes `clinicalScore` — no changes needed
- Clinical data was added via a `clinicalFixes` map in `build100Snakes.ts` (not by changing the venomous() helper signature)
- After data:build, all scores/ranks/classifications in index.json change — this is expected
- The existing 9 snakes loaded from index.json get clinical data from `clinicalFixes` during the correction step
- Pre-existing build failure: `@types/d3` missing for `PhylogenyChart.tsx` — unrelated to scoring changes
