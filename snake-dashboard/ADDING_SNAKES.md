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
| `continent` | enum | `"Africa"` |
| `subregions` | string[] | `["Sub-Saharan Africa"]` |
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
  "coordinates": [{ "lat": -25, "lng": 28 }]
}
```

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

---

## Step 5: Verify

- **Home page**: New snake appears in search results and card grid
- **Detail page**: Navigate to `/snakes/<snake-id>` — all data renders correctly
- **Taxonomy**: Snake appears in the phylogeny tree under its family/genus (auto-built from `lib/snakeTaxonomy.ts`)
- **Search**: Snake is findable by common name, scientific name, family, and genus

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
| `scripts/build100Snakes.ts` | Database rebuild script |
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
