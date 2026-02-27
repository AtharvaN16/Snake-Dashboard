# Performance Plan — Is It Venomous?

Analysis of current performance bottlenecks and prioritized improvements.

---

## Current State Assessment

### Bundle Size Risks

| Dependency | Weight | Issue |
|---|---|---|
| `d3` ^7.9.0 | ~500KB unminified | Full library imported. Only a subset of modules used across the phylogeny tree. |
| `framer-motion` ^12.34.3 | ~100KB gzipped | Used across multiple components. Likely fine if tree-shaken. |
| `react-simple-maps` ^3.0.0 | ~150KB | Loaded on every page via DistributionMap; could be lazy-loaded. |
| `@paper-design/shaders-react` ^0.0.71 | Varies | WebGL shader loaded as background on every page. |
| `rough-notation` ^0.5.1 | ~20KB | Small, but loaded globally. |

### Data Loading Risks

**Static JSON import of all snake data.**
`lib/snakeData.ts` does a static `import snakesJson from '@/data/snakes/index.json'`.
This means the entire snake database (125+ snakes, all fields, images paths, symptoms, GeoJSON paths) is bundled into the JavaScript payload for every page. Estimated size: 200–500KB of raw JSON before minification.

**GeoJSON range files** — loaded on demand per snake detail page. This is fine.

### Image Optimization

- Images are stored as JPEG (800×600 primary, 300×225 thumbnail).
- No WebP or AVIF conversion in the current pipeline.
- Need to audit if `next/image` is used on image-heavy pages (cards, detail page).
- 141 snake image directories + 15 non-snake directories = ~300+ JPEG files served.

### Render-Blocking / Heavy Components

- **PaperAppBackground** (WebGL shader) renders on the home page. No lazy loading.
- **DistributionMap** (react-simple-maps + world topology JSON) renders inline in snake detail pages.
- **HyperbolicTree** (D3 canvas) loads the full D3 library and all snake taxonomy data on page load of `/phylogeny`.
- **LethalityScatterPlot** and **VenomPotencyChart** — D3-based charts on snake detail pages.
- **Framer Motion** animations on SnakeCard and detail page — check for `AnimatePresence` on list pages which can cause layout thrash.

### No Bundle Analysis Tool

Currently there is no `@next/bundle-analyzer` configured, so actual gzipped bundle sizes per route are unknown.

---

## Priority 1 — Immediate (High Impact, Low Effort) ✅ DONE

### 1.1 Add Bundle Analyzer ✅

```bash
bun add -D @next/bundle-analyzer
```

Wrap `next.config.mjs` with:
```js
import withBundleAnalyzer from '@next/bundle-analyzer'
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig)
```

Run: `ANALYZE=true bun run build`
This reveals actual chunk sizes per route before doing any optimization.

### 1.2 Lazy-Load the Phylogeny Tree ✅

The `/phylogeny` page imports D3 and processes all snake taxonomy. Use `dynamic()` in `app/phylogeny/page.tsx`:

```ts
const HyperbolicTreeWrapper = dynamic(() => import('@/components/Phylogeny/HyperbolicTreeWrapper'), { ssr: false })
```

D3 does not run server-side and the hyperbolic tree requires browser APIs. This also removes D3 from the main JS bundle.

### 1.3 Lazy-Load DistributionMap ✅

The map is only visible on snake detail pages and only when range data is available. Lazy-load it:

```ts
const DistributionMap = dynamic(() => import('@/components/DistributionMap'), { ssr: false })
```

This removes react-simple-maps from the initial JS payload.

### 1.4 Lazy-Load PaperAppBackground ✅

The shader background is decorative. Lazy-load with `ssr: false`:

```ts
const PaperAppBackground = dynamic(() => import('@/components/PaperAppBackground'), { ssr: false })
```

---

## Priority 2 — Short Term (High Impact, Moderate Effort)

### 2.1 Migrate Images to WebP

Add WebP output to the image processing pipeline (`scripts/imageProcessing.ts`). Sharp already handles WebP conversion. Target sizes:

| File | Format | Dimensions | Quality |
|---|---|---|---|
| `primary.webp` | WebP | 800×600 | 85 |
| `thumbnail.webp` | WebP | 300×225 | 80 |

Keep JPEG as fallback for the `<picture>` element. Typical savings: 25–35% smaller than JPEG.

### 2.2 Use `next/image` Consistently

Audit all `<img>` tags in components. Replace with `next/image`:

- `SnakeCard.tsx` — thumbnail display
- `SnakeDetailMobileHeader.tsx` — primary image
- `PolaroidStack.tsx` — gallery images
- `ImageCandidatePicker.tsx` — candidate picker

`next/image` provides: lazy loading, `sizes` prop for responsive images, automatic format negotiation (WebP when browser supports), and layout shift prevention via `width`/`height`.

### 2.3 Optimize D3 Imports ✅

Instead of `import * as d3 from 'd3'`, import only the modules used in each component:

```ts
// Before
import * as d3 from 'd3'

// After
import { scaleLog, scaleLinear } from 'd3-scale'
import { line, arc } from 'd3-shape'
```

Run the bundle analyzer first to confirm which D3 modules actually account for the most weight.

### 2.4 Split Snake Data by Route ✅

Instead of importing all 125+ snakes in every page, expose data through route-level loaders:

- **Home page** — only needs `id`, `commonName`, `scientificName`, `dangerScore`, `venomClassification`, `images.thumbnail`, `continent`, `family` for cards + search index.
- **Detail page** — needs full snake data for one snake only.
- **Rank page** — needs `id`, `commonName`, `dangerScore`, `dangerRank`, `venomClassification`.

Create a `getSnakeSummaries()` function in `lib/snakeData.ts` that returns the minimal card fields. The home page uses summaries; detail pages load full data.

---

## Priority 3 — Medium Term (Moderate Impact, Higher Effort)

### 3.1 Static Generation for Snake Detail Pages

Verify that `app/snakes/[id]/page.tsx` is fully statically generated (`generateStaticParams` + no dynamic data fetching). Each detail page should be a static HTML file at build time.

Add `export const dynamic = 'force-static'` if not already the case.

### 3.2 GeoJSON Optimization

- 140 GeoJSON files loaded per snake detail page. Most are large polygon files.
- Consider simplifying geometries (use `mapshaper` with `simplify 20%`) to reduce per-file sizes from ~50–200KB to ~10–30KB.
- Set `Cache-Control: public, max-age=31536000, immutable` for `/geojson/ranges/*.json` in `next.config.mjs`.

### 3.3 Font Subset Loading

PP Pangram Sans loads multiple weights (Regular, Bold, ExtraBold Compressed, SemiBold Italic Slim, Compact Regular). Audit which characters actually appear in the UI and subset the font files with `pyftsubset` or similar. Latin + basic punctuation is typically <50% of the full character set.

### 3.4 Framer Motion Code Split

With Framer Motion 12, the `LazyMotion` API + feature bundles can significantly reduce the library's contribution to the main bundle:

```ts
import { LazyMotion, domAnimation } from 'framer-motion'
// Replace <motion.div> with <m.div> inside LazyMotion boundary
```

### 3.5 Prefetch Strategy for Snake Cards

On the home page, prefetch detail pages for visible snake cards. Next.js does this automatically for `<Link>` components in the viewport when the `prefetch` prop is set (default for App Router).

Confirm that SnakeCard renders an `<Link href="/snakes/[id]">` and not a `router.push`.

---

## Priority 4 — Long Term / Monitoring

### 4.1 Core Web Vitals Monitoring

Add `@vercel/analytics` and `@vercel/speed-insights` to track LCP, CLS, INP in production:

```bash
bun add @vercel/analytics @vercel/speed-insights
```

Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
```

### 4.2 Lighthouse CI

Add a Lighthouse CI step in the deployment pipeline to catch regressions:

```bash
bun add -D @lhci/cli
```

Target scores:
- Performance: ≥ 85
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90

### 4.3 React Compiler (Future)

When Next.js 15 + React Compiler becomes stable, evaluate enabling it for automatic memoization. This eliminates the need for manual `useMemo`/`useCallback` in the phylogeny tree and search components.

---

## Quick Wins Checklist

- [x] Install `@next/bundle-analyzer` and run to get baseline
- [x] `dynamic()` import HyperbolicTreeWrapper in phylogeny page
- [x] `dynamic()` import DistributionMap in snake detail page
- [x] `dynamic()` import PaperAppBackground in home page
- [ ] Audit `<img>` vs `next/image` usage in SnakeCard, detail page header
- [ ] Add `sizes` prop to `next/image` calls
- [ ] Add WebP output to `scripts/imageProcessing.ts`
- [x] Add Cache-Control headers for static GeoJSON in `next.config.mjs`
- [x] Create `getSnakeSummaries()` to slim down home page JS payload
- [ ] Add `@vercel/speed-insights` to layout for production monitoring

---

## Measurement Targets

After optimizations, aim for:

| Metric | Current (estimated) | Target |
|---|---|---|
| Home page JS bundle | ~800KB–1.2MB | <400KB |
| Snake detail page JS | ~700KB–1MB | <350KB |
| Phylogeny page JS | ~1.2MB+ (D3 full) | <500KB (lazy) |
| LCP (home) | Unknown | <2.5s |
| CLS | Unknown | <0.1 |
| Image size (per snake) | ~80–150KB JPEG | <50KB WebP |
