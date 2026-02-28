# Region Refactor Plan

## What We're Fixing and Why

Right now every snake is assigned to exactly one continent — a single string like `"Asia"` or `"North America"`. That works fine for most snakes, but it quietly breaks for wide-ranging species. The Fer-de-Lance lives in both Central and South America. The Yellow-bellied Sea Snake touches Asia, Oceania, and the Pacific. When a user filters by "South America" today, they miss the Fer-de-Lance entirely because it was arbitrarily pinned to North America. That's a factual miss in a database that's supposed to help people identify dangerous snakes.

On top of that, we have two fields — `subregions` and `distribution.regions` — that hold the same text, with no documented reason for either to exist separately. It's dead weight and will cause data drift over time.

The country question is also real. "What's the most dangerous snake in the USA?" is an obvious thing someone would want to know, but right now there's no way to answer it.

---

## The Three Changes

### Change 1 — `continent` becomes `continents` (an array)

**Before:**
```json
{ "continent": "North America" }
```

**After:**
```json
{ "continents": ["North America", "South America"] }
```

**What this touches:**

- `lib/types.ts` — the `Snake` interface and `SnakeSummary` interface both change
- `lib/snakeData.ts` — `filterByContinent` changes from `===` to `.includes()`, `getAllContinents()` needs to flatten arrays and deduplicate, `getSnakeSummaries()` maps `continents` instead of `continent`
- `lib/searchUtils.ts` — the "region" sort uses `snake.continents[0]` (primary continent) for ordering
- `components/RegionPills.tsx` — the prop type changes; the filter logic itself doesn't change because users still pick one continent and we check if the snake includes it
- `components/HomeSearchCard.tsx` — the "Region" group heading uses `snake.continents[0]`
- `data/snakes/index.json` — every single snake entry needs updating (migration script)
- Any scripts that read `snake.continent` directly

**What users will notice:**
Filtering by a continent will now return snakes that live there, not just snakes that were arbitrarily assigned there. The Fer-de-Lance shows up in South America. The Common European Adder shows up in both Europe and Asia. Nothing breaks visually — the filter pills and grouping work exactly the same way, they're just more accurate.

**What to be careful about:**
When sorting by "Region," a multi-continent snake appears under its first listed continent only. It won't be duplicated in the list. This is intentional — duplicating entries would mess up counts and feel wrong. The filter still correctly catches it when you select any of its continents.

---

### Change 2 — Remove `subregions`, keep `distribution.regions`

**Before:**
```json
{
  "subregions": ["Central Australia", "Queensland"],
  "distribution": {
    "regions": ["Central Australia", "Queensland"]
  }
}
```

**After:**
```json
{
  "distribution": {
    "regions": ["Central Australia", "Queensland"]
  }
}
```

**What this touches:**

- `lib/types.ts` — remove `subregions: string[]` from the `Snake` interface
- `app/snakes/[id]/page.tsx` — line 309 reads `snake.subregions` first, falls back to `snake.distribution?.regions`. After removal it reads `distribution.regions` directly.
- `data/snakes/index.json` — delete the `subregions` key from every entry
- `scripts/analyzeHabitatOverlap.ts` — references `snake.subregions`, switch to `snake.distribution.regions`
- `scripts/curateRegionalSnakes.ts` — sets `subregions` during curation, remove that step
- `ADDING_SNAKES.md` — documentation update

**What users will notice:**
The "Southeastern United States" text on the Cottonmouth detail page (and every other snake detail page) comes from `subregions`. After this change it comes from `distribution.regions` instead. Since the two fields contain identical data, users see exactly the same thing. The fallback is already there in the code — we're just removing the layer that was being tried first.

**What to be careful about:**
Verify that `distribution.regions` is populated on every snake before removing `subregions`. If any snake only has `subregions` and not `distribution.regions`, the detail page would show a blank region. A quick data audit before the migration covers this.

---

### Change 3 — Add optional `countries` field (curated, non-exhaustive)

**Before:** No country-level data exists anywhere.

**After:**
```json
{
  "countries": ["USA", "Mexico"]
}
```

**What this touches:**

- `lib/types.ts` — add `countries?: string[]` to the `Snake` interface (optional, not on `SnakeSummary`)
- Data entries — populated manually, one snake at a time, only when confident
- Potential future filter in the UI (not built yet)

**What users will notice:**
Nothing immediately. This field won't be wired into the UI in this phase. It's groundwork for a "most dangerous in [country]" filter later.

**What to be careful about:**

This field is explicitly NOT going into `SnakeSummary` (the lightweight object used by search and the home page). That's intentional. Adding it there would mean every user's browser downloads country lists for all 140 snakes on page load, for a feature that doesn't exist in the UI yet.

It also is NOT going into Fuse.js fuzzy search. Searching "India" and getting 30 cobras ranked by fuzzy match quality is noise, not a useful result. Country-level queries are filter + sort operations, not search operations.

Countries should be added manually and conservatively. High-value targets: US species (rattlesnakes, copperheads, cottonmouth), India (Russell's Viper, Indian Cobra, Krait), Australia (inland taipan, eastern brown, tiger snake), Brazil (Bothrops). Don't batch-assign — each entry needs human review.

---

## What Does NOT Change

- The GeoJSON range maps and `DistributionMap` component are untouched
- The `distribution.habitat` text field is untouched
- The `distribution.coordinates` centroid is untouched
- The phylogeny tree colors (need to verify if it reads `continent` — check `components/Phylogeny/` before touching)
- The danger scoring system is entirely unaffected
- The search fuzzy matching behavior is unaffected

---

## Execution Order

1. **Check phylogeny tree** — confirm whether it reads `continent` and plan accordingly
2. **Write migration script** — converts `"continent": "X"` → `"continents": ["X"]` across all JSON entries, removes `subregions`
3. **Update `lib/types.ts`** — type changes first so TypeScript flags every downstream callsite
4. **Fix callsites** — compiler errors guide the work: `snakeData.ts`, `searchUtils.ts`, `RegionPills.tsx`, `HomeSearchCard.tsx`
5. **Run migration script** — update `data/snakes/index.json`
6. **Manually correct multi-continent species** — Fer-de-Lance, Yellow-bellied Sea Snake, Common European Adder, any others
7. **Update scripts** — `analyzeHabitatOverlap.ts`, `curateRegionalSnakes.ts`
8. **Add `countries?: string[]` to types** — no data yet, just the field
9. **Start curating countries** — high-value species first
10. **Update `ADDING_SNAKES.md`** — document the new schema

---

## Risk Summary

| Change | Risk Level | Why |
|---|---|---|
| `continents[]` migration script | Low | Simple string-to-array transform, easy to verify |
| Type change cascade | Medium | Many callsites, but TypeScript catches them all at compile time |
| Multi-continent manual corrections | Low | Small number of snakes, human-reviewed |
| Removing `subregions` | Low | Never used in UI, compiler catches all script usages |
| Adding `countries?` to types | Very low | Optional field, no UI wired to it yet |
| Curating country data | Low | Manual, conservative, no batch operations |
