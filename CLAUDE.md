# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Is It Venomous?" — a searchable database of venomous snakes built with Next.js (App Router), TypeScript, Tailwind CSS, and Fuse.js for fuzzy search. Snake data lives in a single JSON file (`data/snakes/index.json`) conforming to the `Snake` interface in `lib/types.ts`.

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Dev server at localhost:3000
bun run build            # Production build
bun run lint             # ESLint (flat config, eslint v9)
bun run data:build       # Rebuild snake database (scripts/build100Snakes.ts)
bun run images:process   # Process all snake images (sources from Wikimedia/iNaturalist)
bun run images:validate  # Validate image dimensions and completeness
bun run images:replace <snake-id> <image-path>  # Replace a single snake image
```

Scripts in `scripts/` are run with `bun run` (not `node` or `npx ts-node`).

## Architecture

- **App Router pages**: `app/page.tsx` (home with search), `app/snakes/[id]/page.tsx` (detail page)
- **Data layer**: `lib/snakeData.ts` loads from the static JSON import (`@/data/snakes/index.json`). All snake data access goes through functions in this file (getAllSnakes, getSnakeById, etc.)
- **Search**: `lib/searchUtils.ts` wraps Fuse.js with weighted fuzzy matching on commonName, scientificName, family, genus. Also contains sort logic (`SortOption` type)
- **Danger scoring**: `lib/dangerScore.ts` — weighted composite score (potency 30%, yield 25%, aggression 20%, encounters 15%, medical access 10%)
- **Global state**: `contexts/SearchModalContext.tsx` provides search modal open/close state. `components/KeyboardShortcuts.tsx` handles global keyboard shortcuts
- **UI components**: shadcn/ui base components in `components/ui/`. Domain components (SnakeCard, VenomTypeChip, DangerScoreBar, DistributionMap, HomeSearchCard) at `components/` root
- **Distribution maps**: `components/DistributionMap.tsx` uses react-simple-maps with GeoJSON range data. Range geometry can be inline on the Snake object or loaded from `public/geojson/ranges/<id>.json`
- **Images**: Stored in `public/images/snakes/`. Primary (800x600) and thumbnail (300x225) JPEG versions

## Coding Standards

From `.cursor/rules/CODING-STANDARDS.md`:

- **Max 300 lines per file** (exceptions: content-heavy static pages, generated data files)
- **Max ~50 lines per function** — extract helpers when complexity grows
- **No `any` types** — use explicit TypeScript interfaces
- **Early returns / guard clauses** to reduce nesting
- **Don't create .md files** without asking permission first
- **Single responsibility** per module/function
- Prefer immutable data patterns; remove dead code
