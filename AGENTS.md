# Repository Guidelines

## Project Structure & Module Organization
- The repo root is the Next.js app. Design source assets (SVG/PNG textures, stamps, fonts) live in `design-assets/`.
- `app/` contains App Router pages (`page.tsx`, `snakes/[id]/page.tsx`) and API routes.
- `components/` holds UI and domain components; `components/ui/` is shadcn/ui base.
- `lib/` contains core logic (data loading, search, danger scoring).
- `data/snakes/index.json` is the canonical snake dataset.
- `public/images/snakes/` stores processed JPEG images.
- `scripts/` includes data/image tooling run via Bun.

## Architecture Overview
- Data access flows through `lib/snakeData.ts`; avoid reading `data/snakes/index.json` directly in pages/components.
- Search is implemented in `lib/searchUtils.ts` (Fuse.js configuration + sort options).
- Danger scoring lives in `lib/dangerScore.ts` and should remain the single source of truth.
- Distribution maps render via `components/DistributionMap.tsx` using GeoJSON from `public/geojson/ranges/`.

## Build, Test, and Development Commands
Run commands from the repo root:
- `bun install` installs dependencies.
- `bun run dev` starts the dev server at `http://localhost:3000`.
- `bun run build` creates a production build.
- `bun run start` runs the production server.
- `bun run lint` runs ESLint (flat config).
- `bun run data:build` rebuilds snake data assets from scripts (use after adding/editing species).
- `bun run images:test` processes a small pilot set to validate image sourcing.
- `bun run images:process` processes all snake images (primary images only).
- `bun run images:process:gallery` processes primary plus gallery images.
- `bun run images:retry-failed` retries failed image fetches.
- `bun run images:validate` checks dimensions/completeness of processed images.
- `bun run images:replace <snake-id> <image-path>` replaces a single image and updates metadata.

## Coding Style & Naming Conventions
- TypeScript-first; avoid `any` and model domain types explicitly.
- Prefer guard clauses, small functions (≈50 lines), and single-responsibility modules.
- Keep files under ~300 lines unless content-heavy or generated.
- Match existing naming: React components in `PascalCase`, helpers in `camelCase`.
- Use the repo’s ESLint rules; no dedicated formatter is configured.
- Avoid adding new `.md` files unless explicitly requested.

## Testing Guidelines
- No automated test suite is currently configured.
- For changes, run `bun run lint` and verify pages/flows manually.
- If you add tests, follow the naming pattern `*.test.ts(x)` and document how to run them.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and descriptive (e.g., “Add range mapping support for Stiletto Snake”).
- PRs should include:
  - A concise summary of changes and scope.
  - Linked issue or context if applicable.
  - Screenshots or GIFs for UI changes.
  - Notes on data or image updates (and whether `data:build` or image scripts were run).

## Data & Image Updates
- Data lives in `data/snakes/index.json`; keep entries aligned with `lib/types.ts`.
- Image tooling is in `scripts/` and expects JPEGs at standard sizes.
- Prefer updating data and images together when adding new species.
