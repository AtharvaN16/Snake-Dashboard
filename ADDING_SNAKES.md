# Adding a New Snake to the Database

## Overview

Each snake is a JSON entry in `data/snakes/index.json` conforming to the `Snake` interface in `lib/types.ts`, paired with optimized images in `public/images/snakes/<snake-id>/`.

---

## Step 1: Prepare the JSON Entry

Add an object to the `snakes` array in **`data/snakes/index.json`**.

### Required Fields

| Field | Type | Example |
|-------|------|---------|
| `id` | string (kebab-case) | `"stiletto-snake"` |
| `commonName` | string | `"Stiletto Snake"` |
| `scientificName` | string | `"Atractaspis bibronii"` |
| `family` | string | `"Atractaspididae"` |
| `genus` | string | `"Atractaspis"` |
| `continents` | `Continent[]` | `["Africa"]` |
| `venomClassification` | enum | `"Venomous"` |
| `humanEncounterChance` | enum | `"Moderate"` |
| `dangerScore` | number (0-100) | `38` |
| `dangerRank` | string | `"65/125"` |
| `distribution` | object | See below |
| `images` | object | See below |

### Danger Score Components

```json
"dangerScoreComponents": {
  "clinicalScore": 55,
  "potencyScore": 40,
  "yieldScore": 30,
  "lethalityScore": 35,
  "encounterScore": 45,
  "speedScore": 50
}
```

Composite score is calculated by `lib/dangerScore.ts` with weights:
- Potency: 30% (LD50-based)
- Yield: 25% (dry weight/volume per bite)
- Speed: 20% (venom delivery speed)
- Encounter: 15% (human contact probability)
- Medical access: 10%

### Venom Fields (for venomous snakes)

```json
"venomPotency": {
  "ld50": 0.25,
  "ld50Range": "0.2-0.3",
  "unit": "mg/kg",
  "method": "SC"
},
"venomYield": {
  "dryWeight": 10,
  "qualitative": "Low"
},
"venomTypes": ["Cytotoxic"],
"venomSpeed": "Quick"
```

### Clinical Data

```json
"clinicalData": {
  "untreatedFatalityRate": { "low": 1, "high": 5 },
  "severity": "Moderate"
},
"symptoms": {
  "localEffects": ["Pain", "Swelling", "Necrosis"]
},
"causesOfDeath": ["Secondary Infection"]
```

### Distribution

```json
"distribution": {
  "regions": ["Sub-Saharan Africa"],
  "habitat": "Savanna, grassland, sandy soils",
  "coordinates": [{ "lat": -25, "lng": 28 }],
  "rangeGeoJsonPath": "/geojson/ranges/stiletto-snake.json"
},
"continents": ["Africa"],
"countries": ["South Africa", "Namibia", "Zimbabwe"]
```

#### `continents` — required

An array of one or more values from the canonical `Continent` type:

```
"Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania" | "Antarctica"
```

Most snakes have one continent. Wide-ranging species get multiple — e.g. `["North America", "South America"]` for a snake found in both. This field drives the region filter on the home and rank pages.

#### `distribution.regions` — canonical vocabulary

`distribution.regions` is a display field (shown on the detail page). It must only use strings from the canonical list below. **Do not put country names here** — they belong in `countries[]` instead.

**Canonical region strings:**

| Continent | Allowed strings |
|---|---|
| Africa | `North Africa`, `West Africa`, `Central Africa`, `East Africa`, `Southern Africa`, `Sub-Saharan Africa`, `Madagascar` |
| Asia | `South Asia`, `Southeast Asia`, `East Asia`, `Central Asia`, `Western Asia`, `Middle East`, `Arabian Peninsula`, `Indian Ocean`, `Indo-Pacific` |
| Europe | `Western Europe`, `Southern Europe`, `Central Europe`, `Northern Europe`, `Mediterranean` |
| Americas | `North America`, `Central America`, `South America`, `Northern South America`, `Southern South America`, `Caribbean`, `Eastern United States`, `Southeastern United States`, `Southwestern United States`, `Western United States`, `Central United States`, `Eastern North America`, `Western North America`, `Mexico` |
| Oceania | `Australia`, `Northern Australia`, `Eastern Australia`, `Southeastern Australia`, `Western Australia`, `Central Australia`, `New Guinea`, `Tasmania`, `Pacific Ocean` |
| Multi-region | `Balkans`, `Great Plains`, `Great Lakes`, `Midwest`, `Mediterranean` |

A few notes:
- `Mexico` is allowed as its own region — it's meaningfully distinct from Central America or the US Southwest.
- Australian state-level strings (`Queensland`, `Western Australia`, `Tasmania`) are allowed for species with narrow endemic ranges.
- Sea snakes that range across an ocean basin use `Indo-Pacific`, `Indian Ocean`, or `Pacific Ocean` as appropriate.
- Do not use continent names (`"Asia"`, `"Africa"`) as region strings — that's circular. Use a subregion.
- Do not add `"Florida (introduced)"`, `"Guam"`, `"Cosmopolitan (Global)"` or similar special cases. Introduced populations are not part of native distribution.

#### `countries` — optional, curated

Add only when you are confident in the data. Country names go here, not in `distribution.regions`:

```json
"countries": ["India", "Pakistan", "Bangladesh", "Sri Lanka"]
```

This field is not shown in the UI yet and is not used by search. It's groundwork for a future "most dangerous in [country]" filter. Populate it for high-value species: US rattlesnakes, Indian Big Four, Australian taipans/browns, Brazilian lanceheads. Don't batch-assign — each entry needs human review.

#### Range Maps (GeoJSON)

**Why is there no map or snake range?**  
The detail page shows a distribution map only when the app can load range geometry. That happens when **at least one** of these is true:

- A file exists at `public/geojson/ranges/<snake-id>.json`, or
- The snake’s `distribution.rangeGeoJsonPath` points to a GeoJSON file, or
- The snake’s `distribution.geometry` contains inline GeoJSON.

Snakes added via the build script only get `distribution.regions`, `habitat`, and `coordinates` — **no** `geometry` or `rangeGeoJsonPath`. So they have **no map until you add a range file**. Add the file (see below) and the map will appear; the app discovers ranges by snake `id` from `public/geojson/ranges/`.

To show a distribution overlay on the map, provide a GeoJSON file:

1.  **Locate/Generate GeoJSON**: 
    - **Note: AI should handle range additions for the user.** If you are the user, ask the AI to find and fetch the range GeoJSON for the new snake.
    - Use authoritative sources like IUCN or GARD (see `scripts/README-RANGE-MAPS.md`).
    - Or fetch from iNaturalist using scientific name matches: `bun run scripts/fetchINatRangeGeojsons.ts`.
2.  **Save File**: Place the file in `public/geojson/ranges/<snake-id>.json`.
    - Use the snake's `id` as the filename (e.g. `blue-malayan-coral-snake.json`).
    - Format must be a GeoJSON `Feature` or `FeatureCollection` containing a `Polygon` or `MultiPolygon`.
3.  **Optional — reference in JSON**: For manually edited entries you can add `"rangeGeoJsonPath": "/geojson/ranges/<snake-id>.json"` to the `distribution` object. For build-added snakes, the file alone is enough; the app checks for `public/geojson/ranges/<id>.json` by snake id.

### Images

```json
"images": {
  "primary": "/images/snakes/<snake-id>/primary.jpg",
  "thumbnail": "/images/snakes/<snake-id>/thumbnail.jpg",
  "attribution": {
    "photographer": "Photographer Name",
    "source": "Wikimedia Commons",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:...",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
  }
}
```

---

## Step 2: Prepare Images

Create the directory `public/images/snakes/<snake-id>/` with:

| File | Dimensions | Format | Purpose |
|------|-----------|--------|---------|
| `primary.jpg` | 800x600 | JPEG (quality 90) | Detail page display |
| `thumbnail.jpg` | 300x225 | JPEG (quality 85) | Card/grid view |

### Automated Processing

To process a source image into both sizes:

```bash
bun run images:replace <snake-id> <path-to-source-image>
```

### Sourcing Images

To search Wikimedia Commons and iNaturalist for CC-licensed images:

```bash
bun run scripts/sourceSnakeImages.ts
```

---

## Step 3: Update Metadata

In `data/snakes/index.json`, update the top-level fields:

```json
{
  "lastUpdated": "2026-02-19",
  "totalSnakes": 125,
  "snakes": [...]
}
```

---

## Step 4: Rebuild & Validate

```bash
# Recalculate danger scores and rankings for all snakes
bun run data:build

# Validate image dimensions and completeness
bun run images:validate
```

**Important:** The build script **overwrites** `data/snakes/index.json`. It merges existing data with `newSnakes` / `moreSnakes` (last occurrence wins per snake id), then **enriches** every snake with:

- `continents` (inferred from `distribution.regions` when not explicitly set)
- `commonlyMisidentifiedAs` and `misidentificationRisk` (from `data/commonly-misidentified.json`)
- `fatalitySummary: “Rarely Fatal”` (when untreated fatality rate is very low, or snake is in the rarely-fatal list)
- `symptoms` (from `symptomsProgression` for venomous snakes when missing)
- `otherCommonNames` (only for snakes in the build’s `otherCommonNamesMap` — kept to one snake for “Also known as”)

**To avoid losing this extra info in the future:**

- Do **not** edit `data/snakes/index.json` by hand for fields that the build derives (continents, misidentification, fatalitySummary, symptoms, otherCommonNames). Those come from the build.
- Always run `bun run data:build` after changing the build script or the source data (e.g. `commonly-misidentified.json`).

**If extra info is missing (e.g. Rarely Fatal, Also known as, Symptoms, Commonly misidentified):**

- Run `bun run data:build` once. The enrichment step re-applies to all snakes and rewrites the JSON. Your dev server will then serve the updated data (refresh the detail page).

**Images (gallery / “search for images”):**

- The build **preserves** existing `images.gallery` and `images.galleryAttributions` from each snake when present. So if you added extra images via the search-for-images feature (stored in the JSON), they will **not** be removed on future rebuilds.
- The build still loads primary/thumbnail attribution and optional gallery from the filesystem (`attribution.json`, `gallery-metadata.json`) when a snake has no gallery data in the JSON. To make gallery data survive rebuilds without relying on the JSON, add a `gallery-metadata.json` (and image files) under `public/images/snakes/<snake-id>/`.

**Other optional fields (first aid, accolades, causes of death, etc.):**

- The build **preserves** these from the existing JSON when present: `firstAidInfo`, `behaviorNotes`, `conservationStatus`, `accolades`, `causesOfDeath`, `dataQuality`, `maxLength`, `diet`, `constrictor`. User- or feature-added data in those fields is not lost on rebuild. If you add a **new** optional field to the `Snake` type and store it in the JSON, add it to the `PRESERVED_FIELDS_FROM_EXISTING` array in `scripts/build100Snakes.ts` so rebuilds keep it.

---

## Step 5: Verify

- **Home page**: New snake appears in search results and card grid
- **Detail page**: Navigate to `/snakes/<snake-id>` — all data renders correctly
- **Taxonomy**: Snake appears in the phylogeny tree under its family/genus (auto-built from `lib/snakeTaxonomy.ts`)
- **Search**: Snake is findable by common name, scientific name, family, and genus

---

## Adding a New Snake via the Build Script

If you add a new snake in `scripts/build100Snakes.ts` (in `newSnakes` or `moreSnakes`), do the following so it gets full detail-page data and does not lose it on future builds:

1. **Venomous snakes — clinical data**  
   Add an entry to the `clinicalFixes` object in `build100Snakes.ts` with `fatalityRate: [low%, high%]`, optional `whoCategory`, and `severity`. Otherwise the snake will have no clinical block and no “Rarely Fatal” tag.

2. **Rarely Fatal tag**  
   If the snake is rarely fatal (untreated CFR &lt; ~2%), add its `id` to the `rarelyFatalIds` set in the enrichment section of `build100Snakes.ts`. The build will then set `fatalitySummary: "Rarely Fatal"` (and minimal `clinicalData` if missing).

3. **Commonly misidentified**  
   If the snake is often confused with others, add a mapping in `data/commonly-misidentified.json` under `mappings` (e.g. `"new-snake-id": ["other-snake-id"]`). The build merges this into each snake and sets `misidentificationRisk: "high"` when present.

4. **Also known as**  
   Only one snake should show “Also known as” (to keep the UI minimal). To give that snake an alias, add it to the `otherCommonNamesMap` in the enrichment section (e.g. `"copperhead": ["Highland Moccasin"]`). Use a single primary alias.

5. **Region**
   Set `distribution.regions` using canonical region strings only (see **Distribution → canonical vocabulary** above). Set `continents` explicitly — the build will infer it from `distribution.regions` if missing, but the inference is single-continent only. For wide-ranging species that span multiple continents, set `continents` explicitly in the snake definition.

6. **Symptoms**  
   For venomous snakes, the build maps `symptomsProgression` (short / prog / crit) to `symptoms` automatically. Provide `symptomsProgression` in the `venomous()` call.

7. **Map and snake range**  
   The build does **not** add range geometry or `rangeGeoJsonPath`. To show the distribution map and range on the detail page, add a GeoJSON file at `public/geojson/ranges/<snake-id>.json` (use the same `id` as in the build). The app will detect it and show the map. To generate range files, see **Distribution → Range Maps (GeoJSON)** above and `scripts/README-RANGE-MAPS.md`, or use `bun run scripts/fetchINatRangeGeojsons.ts` to fetch by scientific name.

After editing the script or `commonly-misidentified.json`, run `bun run data:build` once. New snakes will then get all of the above and will keep it on future builds.

---

## Build-safe checklist (new features + new snakes)

Use this so rebuilds don’t break things.

**When adding a new snake (in the build script):**

1. Add it in `newSnakes` or `moreSnakes` with `venomous()` or `nonvenomous()`.
2. If venomous: add an entry to `clinicalFixes` (fatality rate, severity).
3. If rarely fatal: add its `id` to `rarelyFatalIds` in the enrichment section.
4. If commonly confused: add a mapping in `data/commonly-misidentified.json`.
5. For “Also known as” (one alias): add to `otherCommonNamesMap` if desired.
6. Run `bun run data:build` once.
7. **Map / range:** To show the distribution map, add `public/geojson/ranges/<snake-id>.json` (see **Distribution → Range Maps** and `scripts/README-RANGE-MAPS.md`).

**When adding a new feature that stores data on the snake:**

1. Add the field to the `Snake` interface in `lib/types.ts`.
2. If the data is stored in `data/snakes/index.json` and should survive rebuilds, add the field name to the `PRESERVED_FIELDS_FROM_EXISTING` array in `scripts/build100Snakes.ts` (near the end, after the enrichment step). Then the build will merge that field from the existing JSON onto the built snake.
3. Alternatively, store the data elsewhere (e.g. a separate JSON or API) and merge at load time in `lib/snakeData.ts` so the build never touches it.

There is a matching comment in `scripts/build100Snakes.ts` above `PRESERVED_FIELDS_FROM_EXISTING`: *"Adding a new feature that stores data on the snake? Add the field to the Snake type in lib/types.ts, then add the field name here so rebuilds preserve it."*

**What the build overwrites vs preserves:**

| Handled by build (overwritten or added) | Preserved from existing JSON when present |
|----------------------------------------|-------------------------------------------|
| dangerScore, dangerRank, dangerScoreComponents, venomClassification, venomPotency, venomYield, venomTypes, venomSpeed, symptomsProgression, distribution, description, sources, humanEncounterChance | firstAidInfo, behaviorNotes, conservationStatus, accolades, causesOfDeath, dataQuality, maxLength, diet, constrictor, **countries** |
| continents (inferred if not set), commonlyMisidentifiedAs, misidentificationRisk, otherCommonNames, clinicalData, fatalitySummary, symptoms (from symptomsProgression) | images.gallery, images.galleryAttributions |
| images.primary, images.thumbnail, images.attribution (from filesystem) | (any new optional field you add to PRESERVED_FIELDS_FROM_EXISTING) |

---

## Why is `build100Snakes.ts` so long? Is that good practice?

The script is long (~1500+ lines) because it mixes **data** and **logic** in one file:

- **~1000 lines**: `newSnakes` — array of `venomous()` calls (one per venomous snake).
- **~250 lines**: `dataFixes` and `clinicalFixes` — maps of researched LD50/yield and clinical overrides.
- **~85 lines**: `moreSnakes` — array of `nonvenomous()` calls.
- **~200 lines**: Pipeline logic (merge, normalize images, scores, enrichment, preserve, write).

**Is that good practice?** Not really. Best practice is to **separate data from logic**: keep the build script as a short orchestrator and move large data into separate modules or JSON so the script stays readable and data is easier to edit. For example:

- Move **`dataFixes`** and **`clinicalFixes`** into `scripts/build/dataFixes.ts` and `scripts/build/clinicalFixes.ts` (or JSON), and import them in `build100Snakes.ts`.
- Optionally move **`newSnakes`** / **`moreSnakes`** into data modules (e.g. `scripts/build/venomousSnakes.ts`) or a structured format; the main script would then load and pass that data into the same `venomous()` / `nonvenomous()` helpers.

The project uses this split: LD50/yield overrides live in `scripts/build/dataFixes.ts` and clinical (fatality/severity) overrides in `scripts/build/clinicalFixes.ts`; both are imported by `build100Snakes.ts`. When adding a new venomous snake or correcting potency/clinical data, add entries to those files. New snake definitions (`newSnakes` / `moreSnakes`) remain in the main script for now.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `data/snakes/index.json` | Central snake database |
| `lib/types.ts` | `Snake` interface definition |
| `lib/snakeData.ts` | Data loading (getAllSnakes, getSnakeById) |
| `lib/snakeTaxonomy.ts` | Auto-builds taxonomy tree for visualizations |
| `lib/dangerScore.ts` | Danger score calculation engine |
| `lib/searchUtils.ts` | Fuse.js search with weighted matching |
| `scripts/build100Snakes.ts` | Database rebuild script (orchestrator; imports data from `scripts/build/`) |
| `scripts/build/dataFixes.ts` | LD50 and yield overrides per snake (used by build) |
| `scripts/build/clinicalFixes.ts` | Clinical/fatality overrides per snake (used by build) |
| `scripts/imageProcessing.ts` | Image resize/optimization utilities |
| `scripts/validateImages.ts` | Image validation |

---

## Taxonomy (Automatic)

The taxonomy tree is built automatically by `lib/snakeTaxonomy.ts` from each snake's `family` and `genus` fields. The hierarchy is:

```
Serpentes (suborder)
  Alethinophidia (infraorder)
    Henophidia (clade) — Boidae, Pythonidae
    Caenophidia (clade) — Viperidae, Elapidae, Colubridae, etc.
  Scolecophidia (infraorder) — blind snakes
```

If a new family is added that isn't in the existing clade mappings, update `lib/snakeTaxonomy.ts` to assign it to the correct clade/infraorder.
