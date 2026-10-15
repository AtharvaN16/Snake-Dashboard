# Site Maintenance Guide — Is It Venomous?

Ongoing tasks, workflows, and references for maintaining the site.

---

## Quick Reference

| Task | Command / File | Full Guide |
|---|---|---|
| Add a new snake | Edit `scripts/build100Snakes.ts`, then `bun run data:build` | `ADDING_SNAKES.md` |
| Add a range map | Drop GeoJSON in `public/geojson/ranges/<id>.json` | `scripts/README-RANGE-MAPS.md` |
| Replace a snake image | `bun run images:replace <id> <path>` | `docs/IMAGE_MANAGEMENT.md` |
| Process all images | `bun run images:process` | `docs/QUICK_REFERENCE.md` |
| Validate images | `bun run images:validate` | — |
| Rebuild the database | `bun run data:build` | `ADDING_SNAKES.md` |
| Dev server | `bun run dev` | — |
| Production build | `bun run build` | — |

---

## 1. Adding Snakes

Full guide: **`ADDING_SNAKES.md`** at the project root.

### Summary

1. Add the snake definition in `scripts/build100Snakes.ts` using `venomous()` or `nonvenomous()`.
2. Add clinical data entry in `scripts/build/clinicalFixes.ts` (fatality rate, severity).
3. Add LD50/yield data in `scripts/build/dataFixes.ts` if known.
4. Add misidentification mappings in `data/commonly-misidentified.json` if applicable.
5. Run `bun run data:build` to regenerate `data/snakes/index.json`.
6. Add images: `bun run images:replace <snake-id> <source-image>`.
7. Add range GeoJSON: `public/geojson/ranges/<snake-id>.json`.
8. Verify at `/snakes/<snake-id>` in dev.

### Key Rules

- **Never hand-edit** `data/snakes/index.json` for fields the build derives (dangerScore, continent, symptoms, misidentification). The build will overwrite them.
- Fields that **survive rebuilds** must be listed in `PRESERVED_FIELDS_FROM_EXISTING` in `scripts/build100Snakes.ts`. Check `ADDING_SNAKES.md` → "What the build overwrites vs preserves" table.

---

## 2. Adding or Updating Range Maps

Full guide: **`scripts/README-RANGE-MAPS.md`**.

### Quick Add (single snake)

1. Obtain a GeoJSON file (Polygon or MultiPolygon) for the species.
2. Save to `public/geojson/ranges/<snake-id>.json`.
3. The DistributionMap component auto-discovers it by snake ID — no code change needed.

### Bulk Generation from IUCN

1. Download the IUCN Squamata shapefile (~1.3GB) from `iucnredlist.org/resources/spatial-data-download`.
2. Run: `bun run scripts/extractAuthoritativeRanges.ts --source <path>.shp --format shp`
3. Outputs one GeoJSON per matched snake in `public/geojson/ranges/`.

### iNaturalist Fetch

```bash
bun run scripts/fetchINatRangeGeojsons.ts
```

Matches snakes by scientific name to iNaturalist taxa and downloads range polygons.

### Manual Editing

Use [mapshaper.org](https://mapshaper.org/) or QGIS to draw or correct polygons. Export as GeoJSON and save to `public/geojson/ranges/<id>.json`.

---

## 3. Managing Images

Full guide: **`docs/IMAGE_MANAGEMENT.md`** and **`docs/QUICK_REFERENCE.md`**.

### Replace a Single Image

```bash
bun run images:replace <snake-id> ~/path/to/source-image.jpg
```

Generates `primary.jpg` (800×600) and `thumbnail.jpg` (300×225) in `public/images/snakes/<snake-id>/`.

### Process All Images

```bash
bun run images:process           # Primary + thumbnail only
bun run images:process --gallery # With gallery images (slower)
```

### Validate All Images

```bash
bun run images:validate
```

Checks dimensions, format, and attribution. Report at `temp/validation-report.json`.

### Image Licensing

Only use images with CC0, CC BY, or CC BY-SA licenses. Store attribution in `public/images/snakes/<id>/attribution.json` with `photographer`, `source`, `sourceUrl`, `license`, `licenseUrl` fields.

---

## 4. Updating the Danger Score Formula

The danger score formula lives entirely in **`lib/dangerScore.ts`**.

The formula design and version history is documented in **`data/casestudy.md`** (Danger Score Methodology Case Study). Read it before changing weights.

### Current Formula (Version 6)

```
baseIntrinsic = 0.55 × lethalityScore + 0.45 × clinicalScore
speedMod      = 0.90 + 0.20 × (speedScore / 100)
deliveryMod   = 0.50 if (rear-fanged AND not highly venomous); else 1.0
encounterMod  = 0.70 + 0.40 × (encounterScore / 100)

dangerScore = round(((baseIntrinsic × speedMod) × deliveryMod) × encounterMod)
```

### After Any Formula Change

1. Edit `lib/dangerScore.ts`.
2. Run `bun run data:build` — this recalculates `dangerScore` and `dangerRank` for all snakes and writes to `data/snakes/index.json`.
3. Check that top-10 rankings look reasonable (see casestudy.md for expected rankings).
4. Update the formula reference in `data/casestudy.md`.

---

## 5. Updating Taxonomy

The taxonomy tree (used by the phylogeny page and family pages) is defined in **`lib/snakeTaxonomy.ts`**.

It maps each snake `family` to a clade and infraorder:

```
Serpentes → Alethinophidia / Scolecophidia
  Alethinophidia → Henophidia (Boidae, Pythonidae) / Caenophidia (Viperidae, Elapidae...)
```

**When to update:**
- A new snake's `family` isn't covered by the existing clade mappings.
- Taxonomy is revised (e.g. a genus is reclassified to a new family).

**How to update:**
1. Edit the clade map in `lib/snakeTaxonomy.ts`.
2. Restart the dev server. The phylogeny tree rebuilds from the updated map.

---

## 6. Adding Non-Snake Comparison Species

Non-snake data (spiders, jellyfish, etc.) lives in **`data/non-snakes.json`** and is served by the API route at `app/api/non-snakes/route.ts`.

### Adding a Non-Snake

1. Add an entry to `data/non-snakes.json` with `id`, `commonName`, `scientificName`, `venomTypes`, and `images` fields.
2. Process images: `bun run images:process-nonsnakes`
3. Images go to `public/images/non-snakes/<id>/`.

---

## 7. Updating Dependencies

```bash
# Check for outdated packages
bun outdated

# Update a specific package
bun update <package-name>

# After updating Next.js, always run:
bun run build  # Confirm it still compiles
```

**Watch for:**
- `next` major versions — check App Router breaking changes.
- `framer-motion` — API changes between v11 and v12.
- `d3` — v7 to v8 has module path changes.
- `react` — check for hydration/Strict Mode changes when updating.
- `sharp` — pinned in `serverExternalPackages` in `next.config.mjs`; test image processing after updates.

---

## 8. Adding New Pages / Routes

App Router pages go in `app/`. Follow the existing pattern:

```
app/
  new-page/
    page.tsx          # Route component
    layout.tsx        # Optional layout wrapper
```

- Use `generateStaticParams` for dynamic routes that should be statically generated.
- Add the route to the navigation in `app/layout.tsx` or the relevant nav component.

---

## 9. Adding New Snake Fields

When adding a new field to the `Snake` type:

1. Add the field to `lib/types.ts` (`Snake` interface).
2. If the field is set manually (not by the build script), add its name to `PRESERVED_FIELDS_FROM_EXISTING` in `scripts/build100Snakes.ts` so rebuilds don't erase it.
3. If the field is derived/enriched by the build, add logic to the enrichment section of `scripts/build100Snakes.ts`.
4. Update display components as needed.
5. Run `bun run data:build` to apply to all snakes.

---

## 10. Search Behavior

Search is implemented in **`lib/searchUtils.ts`** using Fuse.js.

Currently indexes: `commonName`, `scientificName`, `family`, `genus`.

**To add a new search field:**
1. Add the key to the Fuse.js `keys` array in `lib/searchUtils.ts`.
2. Assign a weight (0–1). Higher weight = more influence on ranking.
3. Ensure the field exists on the snake data passed to Fuse.

**Sort options** are defined as the `SortOption` type in `lib/searchUtils.ts`. Add new sort options there and wire them to the UI in `SearchModal.tsx` and `HomeSearchCard.tsx`.

---

## 11. Deploying

The site is deployed via Vercel.

```bash
# Preview deploy (from any branch)
git push origin <branch-name>

# Production deploy
git push origin main
```

Before deploying to production, run through **`docs/PRE_DEPLOY_CHECKLIST.md`**.

Vercel settings:
- Framework: Next.js
- Node version: 22.x (matches `engines` in `package.json`)
- Build command: `bun run build`
- Install command: `bun install`

---

## Key Files at a Glance

| File | What it controls |
|---|---|
| `data/snakes/index.json` | Source of truth for all snake data |
| `lib/types.ts` | Snake TypeScript interface |
| `lib/snakeData.ts` | Data access functions |
| `lib/dangerScore.ts` | Danger scoring formula |
| `lib/searchUtils.ts` | Fuse.js search config and sort options |
| `lib/snakeTaxonomy.ts` | Taxonomy tree for phylogeny |
| `scripts/build100Snakes.ts` | Database rebuild orchestrator |
| `scripts/build/dataFixes.ts` | Per-snake LD50/yield overrides |
| `scripts/build/clinicalFixes.ts` | Per-snake clinical/fatality overrides |
| `data/commonly-misidentified.json` | Misidentification mappings |
| `public/geojson/ranges/` | Range map GeoJSON files |
| `public/images/snakes/` | Snake images (primary + thumbnail) |
