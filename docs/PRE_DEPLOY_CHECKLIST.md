# Pre-Deploy Checklist — Is It Venomous?

Work through this before merging to `main` and deploying to production.

---

## 1. Build & Type Safety

- [ ] `bun run build` completes with no errors
- [ ] No TypeScript errors (`bun run build` catches these; zero `any` types per coding standards)
- [ ] `bun run lint` produces zero ESLint errors and zero warnings
- [ ] No unused imports or dead-code warnings in changed files

---

## 2. Data Integrity

- [ ] `bun run data:build` has been run after any snake data or script changes
- [ ] `data/snakes/index.json` top-level `totalSnakes` and `lastUpdated` fields are correct
- [ ] All snakes have required fields: `id`, `commonName`, `scientificName`, `family`, `genus`, `continent`, `venomClassification`, `dangerScore`, `dangerRank`, `distribution`, `images`
- [ ] No duplicate snake `id` values in `data/snakes/index.json`
- [ ] `dangerRank` values are consistent (e.g. "1/125" format, sequential, no gaps or duplicates)
- [ ] All `venomClassification` values match the allowed enum in `lib/types.ts`
- [ ] Any new `Snake` interface fields added to `PRESERVED_FIELDS_FROM_EXISTING` in `scripts/build100Snakes.ts`
- [ ] Misidentification data in `data/commonly-misidentified.json` is up to date

---

## 3. Images

- [ ] `bun run images:validate` passes — no missing primaries or thumbnails
- [ ] All new snakes have `primary.jpg` (800×600) and `thumbnail.jpg` (300×225)
- [ ] All image attributions include `photographer`, `source`, `sourceUrl`, `license`, `licenseUrl`
- [ ] No placeholder or test images committed to `public/images/snakes/`
- [ ] `public/images/non-snakes/` images validated (same dimension requirements)
- [ ] Image file sizes are reasonable (primary <200KB, thumbnail <50KB)

---

## 4. Range Maps

- [ ] All new snakes either have a GeoJSON file at `public/geojson/ranges/<id>.json` or the detail page handles gracefully when the map is absent
- [ ] No malformed GeoJSON files (Polygon/MultiPolygon only; no Point or LineString ranges)
- [ ] Range file filenames match snake `id` values exactly (kebab-case)

---

## 5. Performance

- [ ] Dynamic imports in place for heavy components:
  - [ ] `HyperbolicTreeWrapper` on `/phylogeny` page uses `dynamic()` with `ssr: false`
  - [ ] `DistributionMap` on snake detail page uses `dynamic()` with `ssr: false`
  - [ ] `PaperAppBackground` uses `dynamic()` with `ssr: false`
- [ ] No D3 full-library import (`import * as d3`) outside of components already wrapped in `dynamic()`
- [ ] All `<img>` tags on list/card pages replaced with `next/image`
- [ ] `next/image` calls include `width`, `height`, and `alt` props
- [ ] Run `ANALYZE=true bun run build` (once bundle analyzer is added) and check no unexpected large chunks

---

## 6. SEO & Metadata

- [ ] `app/layout.tsx` has base `<title>` and `<meta name="description">` via `metadata` export
- [ ] Snake detail pages have per-snake `<title>` (e.g. "Inland Taipan — Is It Venomous?")
- [ ] `<meta name="description">` on detail pages includes the snake's scientific name and key trait
- [ ] OpenGraph `og:title`, `og:description`, and `og:image` set for home page and detail pages
- [ ] `og:image` resolves to an actual image URL (not a placeholder)
- [ ] No `noindex` meta tags on pages that should be indexed
- [ ] `robots.txt` exists and is correct (Next.js generates one automatically unless overridden)
- [ ] Canonical URLs are correct (no duplicate content via trailing slashes)

---

## 7. Accessibility

- [ ] All `<img>` / `next/image` elements have non-empty `alt` text (use snake common name)
- [ ] Interactive elements (buttons, search, modal) are keyboard accessible
- [ ] Search modal opens/closes with Escape key
- [ ] Focus is managed when modal opens (focus trapped inside modal)
- [ ] Color contrast passes WCAG AA (4.5:1 for body text, 3:1 for large text)
- [ ] Distribution map has a text fallback for screen readers
- [ ] Phylogeny tree has a text fallback (currently canvas-based — needs alt or description)

---

## 8. Routes & Error Handling

- [ ] `/snakes/[id]` returns a proper 404 for unknown snake IDs (not a blank page or crash)
- [ ] `/family/[family]` returns a proper 404 for unknown families
- [ ] `app/not-found.tsx` exists and is styled to match the site
- [ ] API routes (`/api/snakes/[id]/refresh-image`, `/api/non-snakes`) are not accidentally public in production. Evaluate if these admin endpoints need auth.
- [ ] All internal links use relative paths or `<Link href>` (no hardcoded localhost URLs)

---

## 9. Environment & Configuration

- [ ] No `console.log`, `console.warn`, or debug output left in production code
- [ ] No hardcoded `localhost` or `127.0.0.1` URLs in non-script source files
- [ ] No `.env.local` secrets committed to git
- [ ] `next.config.mjs` remote image patterns include only necessary hostnames (currently `upload.wikimedia.org`, `images.unsplash.com`)
- [ ] Node engine version in `package.json` (`"node": "22.x"`) matches Vercel project settings
- [ ] Build command in Vercel is `bun run build` and install command is `bun install`

---

## 10. Security

- [ ] No API keys, tokens, or credentials in committed code or `.env` files
- [ ] Image refresh API routes (`/api/.../refresh-image`) do not allow arbitrary URL fetching (SSRF risk — validate that `sourceUrl` is from an allowlisted domain)
- [ ] No `dangerouslySetInnerHTML` with untrusted data
- [ ] External links use `rel="noopener noreferrer"`
- [ ] `Content-Security-Policy` header evaluated for Vercel deployment

---

## 11. Dependencies

- [ ] `bun audit` shows no high or critical severity vulnerabilities
- [ ] No deprecated packages in `package.json` (check changelogs for Next.js, React, D3, Framer Motion)
- [ ] `sharp` is in `serverExternalPackages` in `next.config.mjs` (required for image processing in serverless)
- [ ] `shapefile` is only used in scripts — not imported in app code (it's a Node.js-only library)
- [ ] All deps in `dependencies` are actually used at runtime; build/script deps moved to `devDependencies`

---

## 12. Content Accuracy

- [ ] Top 10 danger rankings look correct (see `data/casestudy.md` for expected top-10 with current formula)
- [ ] No snake detail pages show blank/missing critical data sections (venom type, distribution, clinical data)
- [ ] Misidentification warnings display correctly for high-risk species
- [ ] "Rarely Fatal" tags appear on the correct snakes
- [ ] Accolades (e.g. "Most Potent Venom") are factually accurate and attached to correct snakes
- [ ] Image attributions display on detail pages

---

## 13. Browser & Device Testing

- [ ] Home page — Chrome, Firefox, Safari (desktop)
- [ ] Snake detail page — mobile viewport (375px wide)
- [ ] Search modal — keyboard navigation works on mobile
- [ ] Phylogeny tree — loads and renders on mobile (or shows appropriate fallback)
- [ ] Distribution map — renders without console errors on Safari (WebKit)
- [ ] Paper shader background (`PaperAppBackground`) — degrades gracefully if WebGL is unavailable

---

## 14. Licensing & Attribution

- [ ] PP Pangram Sans font license confirmed for commercial/web use
- [ ] All snake images have valid open licenses (CC0, CC BY, CC BY-SA)
- [ ] Image attribution visible on detail pages
- [ ] GeoJSON range data sources documented (IUCN, iNaturalist, GARD)
- [ ] No third-party SVGs or icons without verified licenses

---

## 15. Final Checks

- [ ] `git status` is clean (no untracked or staged files left over)
- [ ] `temp/` directory is empty or gitignored (no processing artifacts)
- [ ] `.next/` is gitignored (build output not committed)
- [ ] `node_modules/` is gitignored
- [ ] PR reviewed and approved before merging to `main`
- [ ] Vercel preview deploy tested at the preview URL before promoting to production

---

## Sign-Off

| Check | Owner | Date |
|---|---|---|
| Build & types | | |
| Data integrity | | |
| Images validated | | |
| Performance review | | |
| SEO metadata | | |
| Accessibility | | |
| Browser testing | | |
| Security review | | |
