# Commonly Misidentified Snakes - Data Entry Guide

## Current Status

**5 out of 124 snakes** currently have misidentification data:
- Copperhead → Cottonmouth, Water Snake
- Cottonmouth → Copperhead, Water Snake
- Eastern Coral Snake → Milk Snake
- Russell's Viper → Sand Boa, African Rock Python
- Water Snake → Cottonmouth

## How Many Snakes Are Applicable?

Based on analysis of our database:

- **Total snakes:** 124
- **Primary candidates:** ~35 snakes
  - Highly venomous snakes (28 total)
  - Venomous snakes with high encounter rates
  - These are most likely to be confused with other species
  
- **Secondary candidates:** ~6 snakes
  - Non-venomous snakes with high encounter rates
  - Often confused with venomous species

- **Estimated total applicable:** ~41 snakes minimum
  - This is a conservative estimate
  - Many more could have misidentification data based on regional patterns
  - Focus on the 35 primary candidates first

## How to Add Misidentification Data

### Option 1: Using the Helper Script (Recommended)

1. Open `scripts/addMisidentificationData.ts`
2. Edit the `MISIDENTIFICATION_MAP` object with your entries:
   ```typescript
   const MISIDENTIFICATION_MAP: Record<string, string[]> = {
     "snake-id": ["confused-with-id-1", "confused-with-id-2"],
     // Add more entries...
   };
   ```
3. Run: `bun run scripts/addMisidentificationData.ts`
4. The script will:
   - Validate that all referenced snake IDs exist
   - Warn about invalid IDs
   - Update `data/snakes/index.json` automatically

### Option 2: Manual JSON Editing

1. Open `data/snakes/index.json`
2. Find the snake entry you want to update
3. Add `commonlyMisidentifiedAs` field after `sources`:
   ```json
   {
     "id": "snake-id",
     "commonName": "Snake Name",
     ...
     "sources": ["WHO", "Reptile Database"],
     "commonlyMisidentifiedAs": ["other-snake-id-1", "other-snake-id-2"],
     "continent": "..."
   }
   ```
4. Save the file

## Common Misidentification Patterns

Based on research, here are well-documented confusion patterns:

### North America
- **Copperhead** ↔ Cottonmouth, Water Snake
- **Cottonmouth** ↔ Copperhead, Water Snake  
- **Eastern Coral Snake** ↔ Milk Snake, Scarlet Kingsnake
- **Water Snake** ↔ Cottonmouth

### Asia
- **Russell's Viper** ↔ Common Sand Boa, Indian Rock Python
- **Common Krait** ↔ Wolf Snake (if in database)
- **Indian Cobra** ↔ Rat Snake (if in database)

### Australia
- **Eastern Brown Snake** ↔ Tiger Snake (similar appearance)
- **Death Adder** ↔ Other elapids (similar body shape)

### Africa
- **Puff Adder** ↔ Other vipers (camouflage confusion)

## Finding Snake IDs

To find the correct snake ID:
1. Search `data/snakes/index.json` for the common name
2. Look for the `"id"` field (e.g., `"id": "copperhead"`)
3. Use that exact ID string in your mappings

**Quick tip:** Run `bun run scripts/analyzeMisidentificationCandidates.ts` to see a list of top candidates and their IDs.

## Top Priority Candidates (Without Data Yet)

These 35 snakes are the highest priority for adding misidentification data:

**Highly Venomous + High Encounter:**
- Puff Adder (puff-adder) - Africa
- Eastern Brown Snake (eastern-brown-snake) - Oceania  
- Indian Cobra (indian-cobra) - Asia
- Tiger Snake (tiger-snake) - Oceania
- Philippine Cobra (philippine-cobra) - Asia
- Monocled Cobra (monocled-cobra) - Asia
- Fer-de-Lance (fer-de-lance) - North America
- Saw-scaled Viper (saw-scaled-viper) - Africa
- Common Krait (common-krait) - Asia
- And 26 more...

**To see the full list:** Run `bun run scripts/analyzeMisidentificationCandidates.ts`

## Validation

The helper script automatically:
- ✅ Checks that all referenced snake IDs exist
- ✅ Warns about invalid IDs
- ✅ Skips invalid entries
- ✅ Preserves existing data

## Data Sources

When researching misidentifications, check:
1. **Snakepedia Look Alike** - https://snakepedia.org/webapp/lookAlike/
2. **Wikipedia** - Search "[Snake Name] similar species"
3. **Regional field guides** - Herpetological society resources
4. **Nature.org Field Guide** - Common misidentifications

## Example: Adding Russell's Viper Data

```typescript
// In scripts/addMisidentificationData.ts
const MISIDENTIFICATION_MAP: Record<string, string[]> = {
  "russells-viper": ["sand-boa", "indian-rock-python"],
};
```

Then run: `bun run scripts/addMisidentificationData.ts`

The script will add this to Russell's Viper entry in `index.json`.
