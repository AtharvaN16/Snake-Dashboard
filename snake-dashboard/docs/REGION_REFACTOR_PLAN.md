# Region Refactor Plan

## What We're Fixing and Why

Right now every snake is assigned to exactly one continent — a single string like `"Asia"` or `"North America"`. That works fine for most snakes, but it quietly breaks for wide-ranging species. The Fer-de-Lance lives in both Central and South America. The Yellow-bellied Sea Snake touches Asia, Oceania, and the Pacific. When a user filters by "South America" today, they miss the Fer-de-Lance entirely because it was arbitrarily pinned to North America. That's a factual miss in a database that's supposed to help people identify dangerous snakes.

On top of that, we have two fields — `subregions` and `distribution.regions` — that hold the same text, with no documented reason for either to exist separately. It's dead weight and will cause data drift over time.

The country question is also real. "What's the most dangerous snake in the USA?" is an obvious thing someone would want to know, but right now there's no way to answer it.

---

## Phase 1 — Schema & Code ✅ COMPLETE

### ~~Change 1 — `continent` becomes `continents` (an array)~~

~~**Before:**~~
```json
{ "continent": "North America" }
```

~~**After:**~~
```json
{ "continents": ["North America", "South America"] }
```

**What was touched:**

- ~~`lib/types.ts` — exported new `Continent` type alias; `Snake` and `SnakeSummary` interfaces both updated~~
- ~~`lib/snakeData.ts` — `filterByContinent` uses `.includes()`, `getAllContinents()` flattens arrays, `getSnakeSummaries()` maps `continents`~~
- ~~`lib/searchUtils.ts` — the "region" sort uses `snake.continents[0]` (primary continent) for ordering~~
- ~~`components/RegionPills.tsx` — prop type updated to `Continent`~~
- ~~`components/HomeSearchCard.tsx` — the "Region" group heading uses `snake.continents[0]`~~
- ~~`components/Phylogeny/HyperbolicTree.tsx` — `uniqueContinents` flattens arrays, `getContinentForSpeciesId` returns `Continent[]`~~
- ~~`components/Phylogeny/treeInteractions.ts` — all interface types use `Continent`, filter check uses `.includes()`~~
- ~~`app/rank/page.tsx` — `uniqueContinents` uses `flatMap`, filter uses `Continent` type~~
- ~~`components/VenomPotencyChart.tsx` — `uniqueRegions` uses `flatMap`, filter uses `.includes()`~~
- ~~`data/snakes/index.json` — all 140 snakes migrated via `scripts/migrateContinent.ts`~~
- ~~`scripts/build100Snakes.ts`, `scripts/curateRegionalSnakes.ts`, `scripts/analyzeHabitatOverlap.ts` — updated~~

**Known cosmetic issue (low priority):** On the detail page, multi-continent snakes show all continents joined as the clickable link text (e.g. "Asia, Oceania, North America, South America") but the href routes to `continents[0]` only. Needs a better display treatment when there are multiple continents.

---

### ~~Change 2 — Remove `subregions`, keep `distribution.regions`~~

~~All 140 entries had `subregions` deleted. `app/snakes/[id]/page.tsx` now reads `distribution.regions` directly.~~

---

### ~~Change 3 — Add optional `countries` field (type only)~~

~~`countries?: string[]` added to `Snake` interface in `lib/types.ts`. No data populated yet.~~

---

### ~~Change 4 — Initial multi-continent corrections (3 snakes)~~

~~Corrected during migration:~~
- ~~Fer-de-Lance: `["North America", "South America"]`~~
- ~~Yellow-bellied Sea Snake: `["Asia", "Oceania", "North America", "South America"]`~~
- ~~Common European Adder: `["Europe", "Asia"]`~~

---

## Phase 2 — Remaining Continent Mismatches

Six snakes have `continents[]` that don't match their `distribution.regions`. These cause silent filter failures — a user filtering Asia won't see the saw-scaled viper even though it lives in South Asia.

| Snake | Current | Correct | Evidence |
|---|---|---|---|
| `saw-scaled-viper` | `["Africa"]` | `["Africa", "Asia"]` | regions: Middle East, North Africa, **South Asia** |
| `beaked-sea-snake` | `["Oceania"]` | `["Asia", "Oceania"]` | regions: Indian Ocean, **Southeast Asia** |
| `banded-sea-krait` | `["Oceania"]` | `["Asia", "Oceania"]` | regions: Indo-Pacific, **Southeast Asia** |
| `eyelash-viper` | `["North America"]` | `["North America", "South America"]` | regions include **South America** |
| `boa-constrictor` | `["North America"]` | `["North America", "South America"]` | regions include **South America** |
| `cat-eyed-snake` | `["North America"]` | `["North America", "South America"]` | regions include **South America** |

These are direct JSON edits to `data/snakes/index.json`. No code changes needed.

---

## Phase 3 — `distribution.regions` Data Quality

This is the messier problem. The field has 67 unique region strings across 140 snakes. Most are fine geographic subregions, but there are three categories of problems.

### Problem A — Country names used where subregions belong

The rule: **country names belong in `countries[]`, not in `distribution.regions`**. The display field should use geographic subregions only.

| Snake | Current regions | Fix |
|---|---|---|
| `common-krait` | `["India", "Pakistan", "Bangladesh", "Sri Lanka"]` | `["South Asia"]` — move countries to `countries[]` |
| `jararaca` | `["Brazil", "Paraguay", "Argentina"]` | `["Southern South America"]` — move countries to `countries[]` |
| `javan-spitting-cobra` | `["Indonesia"]` | `["Southeast Asia"]` |
| `philippine-cobra` | `["Philippines"]` | `["Southeast Asia"]` |
| `japanese-mamushi` | `["Japan", "East Asia"]` | `["East Asia"]` — Japan is redundant |
| `amethystine-python` | includes `"Indonesia"` | Drop Indonesia, keep `["Australia", "New Guinea"]` |
| `green-tree-python` | includes `"Indonesia"` | Drop Indonesia, keep `["Australia", "New Guinea"]` |

**Mexico is a judgment call.** Ten snakes list Mexico alongside US subregions (e.g. `["Southwestern United States", "Mexico"]`). Mexico is a meaningful geographic entity distinct from "Central America" — keeping it is defensible. Leave these alone unless there's a specific reason to change them.

### Problem B — Broken or meaningless region strings

| Snake | Problem | Fix |
|---|---|---|
| `brahminy-blind-snake` | `"Cosmopolitan (Global)"` | This snake is genuinely pantropical and invasive worldwide. Best option: `["Asia", "Oceania", "Africa"]` as its native range, with a note in `description`. Don't try to enumerate all continents. |
| `milk-snake` | `"Americas"` | `["North America", "Central America"]` — its actual range |
| `burmese-python` | `["Southeast Asia", "Florida (introduced)"]` | `["Southeast Asia"]` — introduced populations don't belong in distribution.regions |
| `dice-snake` | `["Europe", "Asia"]` | `["Europe", "Western Asia"]` — using continent names as region names is circular |
| `grass-snake` | `["Europe", "Western Asia"]` | Already correct |
| `common-adder` | `["Europe"]` | Should be `["Europe", "Western Asia"]` to reflect its actual range into Russia/China |
| `banded-sea-krait` | mixes `"Indo-Pacific"`, `"Southeast Asia"`, `"Oceania"` | `["Indo-Pacific"]` alone is sufficient and accurate |

### Problem C — Inconsistent vocabulary for the same concept

These don't need immediate fixing but create noise:
- `"Mediterranean"` vs `"Mediterranean Europe"` — pick one
- `"Indo-Pacific"` vs `"Indian Ocean"` + `"Southeast Asia"` — pick one convention for sea snakes
- `"Sub-Saharan Africa"` alongside specific `"West Africa"`, `"East Africa"` etc. — fine as-is, subregions are more precise
- `"Guam"` on `brown-tree-snake` — this is an introduced population, same as Florida. Remove.

---

## Phase 4 — Canonical Region Vocabulary

Define a fixed list so the field doesn't drift. Every entry in `distribution.regions` must use one of these strings. Document this in `ADDING_SNAKES.md`.

**Proposed canonical list (~38 strings):**

```
Africa:        North Africa, West Africa, Central Africa, East Africa,
               Southern Africa, Sub-Saharan Africa, Madagascar

Asia:          South Asia, Southeast Asia, East Asia, Central Asia,
               Western Asia, Middle East, Arabian Peninsula,
               Indian Ocean, Indo-Pacific

Europe:        Western Europe, Southern Europe, Central Europe,
               Northern Europe, Mediterranean

Americas:      North America, Central America, South America,
               Northern South America, Southern South America,
               Caribbean, Eastern United States, Southeastern United States,
               Southwestern United States, Western United States,
               Central United States, Eastern North America,
               Western North America, Mexico

Oceania:       Australia, Northern Australia, Eastern Australia,
               Southeastern Australia, Western Australia, Central Australia,
               New Guinea, Tasmania, Pacific Ocean
```

**Open decisions before finalising:**
- Keep `Mexico` as its own region string? (Currently used by 10 snakes — recommend yes)
- Keep granular Australian states (`Queensland`, `Western Australia`, `Tasmania`)? (Used by inland taipan, dugite, tiger snake — recommend yes, they're genuinely narrow-range species)
- How to handle truly cosmopolitan snakes? (`brahminy-blind-snake` — recommend native range only)

---

## Phase 5 — South America Representation Gap

South America has 12 snakes in the database. Europe has 11. Both are underrepresented relative to their medical importance, but South America is the real problem. The continent is responsible for the majority of snakebite deaths in the Americas, driven by *Bothrops* species, *Lachesis muta*, and *Crotalus durissus* variants.

Current South American snakes:
- `fer-de-lance`, `south-american-rattlesnake`, `bushmaster`, `jararaca` — core coverage good
- `false-water-cobra`, `green-anaconda`, `yellow-anaconda`, `amazon-tree-boa`, `rainbow-boa`, `emerald-tree-boa` — mostly non-venomous/constrictors
- `cuban-tree-snake` — Caribbean, not continental South America
- `eyelash-viper` — spans Central and South America

**What's missing that matters:**
- *Bothrops moojeni* (Brazilian lancehead) — major snakebite species, Brazil
- *Bothrops alternatus* (urutu) — Argentina/Brazil/Uruguay
- *Micrurus* species (South American coral snakes) — no South American Micrurus represented
- *Bothrops atrox* (common lancehead) — widespread in Amazonia

This is data curation work, not a code task. Add these incrementally via the normal `venomous()` process in `build100Snakes.ts`.

---

## Phase 6 — Detail Page Display for Multi-Continent Snakes

The current detail page shows `snake.continents.join(", ")` as a single clickable link that routes to `continents[0]`. For a snake with four continents this looks wrong.

**Options:**
1. Show only `continents[0]` as a link, suppress the rest silently — simple but hides real data
2. Render each continent as a separate link — accurate but takes more space
3. Show `continents[0]` as the link with a `+N more` indicator — compact

This affects very few snakes currently (Yellow-bellied Sea Snake, Fer-de-Lance, etc.) but will matter more as the data gets corrected.

---

## Execution Order (remaining work)

1. **Phase 2** — Fix 6 continent mismatches (JSON edits, ~20 min)
2. **Phase 3A + 3B** — Fix broken region strings (JSON edits, ~1 hr)
3. **Phase 4** — Document canonical vocabulary in `ADDING_SNAKES.md`
4. **Phase 6** — Decide on detail page display for multi-continent snakes
5. **Phase 5** — Add South American species (ongoing, not time-boxed)
6. **Phase 3C** — Vocabulary normalisation pass (low urgency, do after canonical list is locked)

---

## Risk Summary

| Change | Risk Level | Why |
|---|---|---|
| ~~`continents[]` migration script~~ | ~~Low~~ | ~~Done~~ |
| ~~Type change cascade~~ | ~~Medium~~ | ~~Done — zero new TS errors~~ |
| ~~Multi-continent corrections (initial 3)~~ | ~~Low~~ | ~~Done~~ |
| ~~Removing `subregions`~~ | ~~Low~~ | ~~Done~~ |
| ~~Adding `countries?` to types~~ | ~~Very low~~ | ~~Done~~ |
| Phase 2 continent mismatches (6 snakes) | Low | Direct JSON edits, easy to verify against distribution.regions |
| Phase 3 region string cleanup | Low | Display-only field, no filter logic depends on specific strings |
| Phase 4 canonical vocabulary | Low | Documentation only, no code changes |
| Phase 5 new species | Low | Additive, no existing data touched |
| Phase 6 detail page display | Low | UI change, small number of affected snakes |
