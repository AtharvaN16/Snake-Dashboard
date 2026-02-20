# Rankings Page — Visual Design Fix Plan

A front-end critique of `app/rank/page.tsx` and related components.
Goal: modern, classy, internally consistent. No emoji-as-UI, no fragmented type scale, no dead columns.

---

## 1. Critical Bugs

### 1a. Column Alignment Mismatch
The table header and each row use *different* first-column widths:
- **Header**: `sm:grid-cols-[320px_1fr_120px]`
- **Row**: `sm:grid-cols-[360px_1fr_120px]`

The "Snake" column header is 40px narrower than the actual image cells.
"Composition" and "Score" labels are misaligned by 40px on every row.

**Fix**: Unify to a shared constant — e.g. both use `sm:grid-cols-[360px_1fr_140px]`.

---

## 2. Header — Replace Emoji with Something Classy

**Problem**: A giant `text-5xl` 🏆 / ⚗️ emoji is the page's hero visual. Emojis render differently across platforms (Apple vs. Windows vs. Android), look low-fidelity, and feel informal. The serif `h1` beneath it wants to be editorial but is undermined immediately.

**Fixes**:
- Replace emoji with a small inline SVG or a styled typographic glyph (e.g. a subtle `#` or a rank crown icon from Lucide)
- Tighten the header's vertical rhythm — the `mb-6` above and below the header don't match the visual weight
- The subtitle copy is too long and wraps awkwardly — consider a shorter tagline for "Potency Ladder" mode

---

## 3. View Toggle Buttons — Style Inconsistency

**Problem**: Active state uses `bg-stone-800 text-white rounded-lg`. Everywhere else in the page (chips, filter pills) uses `rounded-full`. Even the score badge uses `rounded-full`. The tab-style toggle stands out as the only rectangular UI element.

**Fix**: Switch to a segmented control pattern — a pill-shaped outer container with the active segment sliding between states. This is the standard modern pattern (used in Apple, Linear, Vercel dashboards).

```
[ Danger Rankings | Potency Ladder ]
     ^^^active indicator slides^^^
```

Or at minimum: change `rounded-lg` → `rounded-full` to match the rest of the page's language.

---

## 4. Back Navigation — Too Timid

**Problem**: The Esc/Back area is a `text-sm text-stone-600` line with a `kbd` chip. It gets lost — it reads like body text, not navigation. There's no chevron, no visual affordance that it's a link.

**Fix**: Make it a proper back-link pattern:
```
← Back to Explorer
```
Use a `←` arrow (or ChevronLeft from Lucide), slightly heavier weight, and dedicate the `kbd` chip to a tooltip or remove it from the page flow entirely. The keyboard shortcut is a hint, not the navigation itself.

---

## 5. Rank Numbers — No Visual Hierarchy for Top 3

**Problem**: Rank #1 looks identical to rank #47. The `#rank` pill inside the image overlay is `text-xs` with a semi-transparent dark background. The color tinting (`#FFD1D1` for ≤3, `#FFE3C8` for ≤10) is there but barely perceptible.

**Opportunities**:
- **Rank 1–3**: Give gold/silver/bronze treatment. A thin colored left-border on the row (gold `#D4AF37`, silver `#C0C0C0`, bronze `#CD7F32`) is tasteful and immediately scannable without being gaudy
- Make the rank number `text-base` or `text-lg font-bold` inside the overlay pill — it's the most important datum on the page
- The `h-1.5 w-10 rounded-full` color bar next to the rank number (the `rankBarColor` element) is so small (6px tall) it's decorative noise. Either make it a meaningful progress bar or remove it

---

## 6. Score Column — Just a Number

**Problem**: The score badge is a pill showing a number (e.g. `87`) with no context. A reader can't tell at a glance if 87 is high, low, or middling. In potency mode, the badge shows `0.032 mg/kg` with a tiny `LD₅₀ (SC)` label above it — the label is `text-[10px]` (≈8.5px rendered), which violates accessibility minimum of 11px for informational text.

**Fixes**:
- Under the score badge, add a thin `w-full` progress bar (the `rankBarColor` already has the logic) — this gives instant visual comparison
- In potency mode, replace the sky-blue badge (`bg-sky-100 text-sky-800 border-sky-300`) — sky blue has no semantic meaning here. Use the same red-to-green gradient logic as danger mode, inverted (low LD50 = red = dangerous)
- Bump `LD₅₀ (SC)` label to at least `text-xs` (12px)

---

## 7. Potency Mode "Notes" Column — Dead Space

**Problem**: In potency mode the middle "Notes" column shows only the static string `"LD₅₀ lower = more toxic"` — the same text on every single row. It's a wasted column.

**Opportunities** (pick one):
- Show the snake's **venom classification** chip + **family** name — useful context for comparing LD50 values
- Show a **mini horizontal bar** representing LD50 value relative to the range (0.01–500 mg/kg on a log scale) — this is powerful data visualization in the table itself
- Show **continent** + **venom type** (cytotoxic, neurotoxic, hemotoxic) — these explain *why* the LD50 value matters

---

## 8. Typography — No Consistent Scale

**Problem**: The codebase mixes at least 8 different font sizes using arbitrary bracket notation:
`text-[10px]`, `text-[9px]`, `text-[11px]`, `text-[12px]` alongside semantic Tailwind sizes `text-xs` (12px), `text-sm` (14px), `text-lg`, etc. There's also hardcoded `text-[#2c2c2c]` while the CSS variable `--foreground` exists.

**Fix**: Adopt a strict 4-step text scale for the page:
- **Display**: `text-4xl font-serif` — page title only
- **Body strong**: `text-sm font-semibold` — snake names, labels
- **Body**: `text-sm` — descriptions, chip content
- **Caption**: `text-xs` (12px minimum) — secondary metadata, unit labels

Eliminate all `text-[Npx]` notation below 12px. Remove hardcoded `text-[#2c2c2c]` in favor of `text-foreground`.

---

## 9. Table Controls Bar — Visual Clutter

**Problem**: The controls bar at the top of the table has `bg-stone-50/80` while the sticky header beneath it has `bg-stone-100/95` — two subtly different grays for what should read as a single control surface. The region filter "Clear filter" is an `underline text-xs` link — the only underlined link on the page.

**Fixes**:
- Unify the controls bar + sticky header into a single bg token (e.g. both `bg-stone-50`)
- Replace the underlined "Clear filter" with a small `×` badge chip matching the region chip style — cleaner and consistent with the filter chip pattern

---

## 10. Hover State — Too Subtle

**Problem**: Row hover is `hover:bg-stone-100/70`. On the `bg-white` table surface this is a ~5% gray shift — most users won't notice it. There's also no transition on the image zoom (the `group-hover:scale-[1.03]` is there but `duration-300` is the only transition).

**Fixes**:
- Bump hover to `hover:bg-stone-100` (remove the /70 opacity dilution) so it's clearly perceptible
- Add a subtle left-border flash on hover: `hover:border-l-2 hover:border-l-stone-400` — gives the row a sense of selection without looking like a spreadsheet

---

## 11. Image Fallback — Emoji Placeholder

**Problem**: When no image exists the cell shows a giant `text-5xl` 🐍 emoji centered in the image box. Same platform-rendering problem as the header emoji.

**Fix**: Replace with a styled SVG snake silhouette or a simple initials-style tile using the snake's common name first letter, on a muted stone-colored background. This is more professional and consistent.

---

## 12. Footer — Informal Copy

**Problem**: `"Researched 🔬 by Atharva"` with a GitHub link is charming but out of character with an otherwise editorial serif-headline page. The link goes to `github.com` (root), not the actual repo.

**Fix**: Either remove the footer entirely (the page is self-evident) or make it a minimal attribution line: `Data compiled by Atharva Nayak · 2024` without the emoji, styled as `text-xs text-stone-400`.

---

## 13. Missing Affordances

| Missing element | Why it matters |
|---|---|
| Result count ("Showing 52 snakes") | Users filtered by region have no idea how many results they're seeing |
| Column for "Rank #" in header | The rank number is buried inside the image; the header has no rank column |
| Empty state for potency mode with no data | If a snake has no LD50, the row disappears with no explanation |
| Scroll-to-top button | With 50+ rows, getting back to the controls bar requires scrolling |
| Sort indicator in header | No visual cue that clicking column headers could sort |

---

---

## 14. Image Issues

### 14a. Thumbnails Are Being Upscaled (Blur)

**The source thumbnails are 300×225px. The image column is 360px wide. `sizes="400px"` is set.**

Next.js will request images at ~400px width from its optimization pipeline, but the source file is only 300px — so the image gets **upscaled 33%** before being served. This causes softness/blur that's especially noticeable on Retina/HiDPI displays where the effective pixel demand is doubled (720px).

**Fix**: Either:
- Regenerate thumbnails at `480×360px` (or larger), or
- Change `sizes="400px"` → `sizes="(max-width: 640px) 100vw, 360px"` and accept the slight upscale as a known limitation

The primary images (800×600px) are fine — they're only used on detail pages.

### 14b. No `priority` on Above-the-Fold Images

`<Image>` in `RankTableRow` has no `priority` prop. By default, Next.js lazy-loads all images. On the rankings page, rank #1–#8 are always above the fold — they're the **LCP elements** — but they're being lazy-loaded, causing a delayed Largest Contentful Paint.

**Fix**: Pass `priority` as a prop to `RankTableRow` and set it for the first `N` rows (e.g. `rank <= 8`).

```tsx
// In RankTableRow signature:
{ snake, rank, viewMode, priority }: { snake: Snake; rank: number; viewMode: ViewMode; priority?: boolean }

// On the <Image>:
<Image priority={priority} ... />

// In the map:
<RankTableRow priority={index < 8} ... />
```

### 14c. Row Image Heavily Crops the Thumbnail

The row's image container is `h-32` on mobile (128px) and `min-h-[140px]` on desktop in a 360px-wide column. At 4:3 aspect ratio (the thumbnail's native ratio), a 360px-wide image would need 270px of height to show fully. But the container is only 140px minimum — showing just **52% of the image height** via `object-cover` center-crop.

The crop is unpredictable — the center of the image is often the snake's mid-body, cutting off both head and tail. This is especially bad for long thin snakes (kraits, mambas).

**Fix options**:
- Set `objectPosition="top"` on the `<Image>` so the snake's head/face is more likely to be visible
- Increase the minimum row height to allow more image to show (e.g. `min-h-[200px]`)
- Add `object-[center_30%]` as a per-snake tunable if images have known focal points

### 14d. Blur Glow Effect Makes a Second Unoptimized Request

The decorative glow behind the text (the `absolute` div with `backgroundImage: url(${imageUrl})`) is an **inline CSS background-image** — it bypasses Next.js image optimization entirely. The browser fetches the thumbnail URL as a raw, unoptimized request separate from the `<Image>` component that gets the CDN-optimized version.

This means each row with an image triggers **two** image requests for the same URL: one through Next.js (`<Image>`) and one raw through CSS background. On a 50-row list this doubles thumbnail network load.

**Fix**: Remove the decorative glow div, or implement it via a second `<Image fill>` with `aria-hidden` so it goes through the same optimization pipeline and benefits from browser cache deduplication.

### 14e. Five Orphaned PNG Thumbnails on Disk

Five snakes have **both** `.png` and `.jpg` thumbnail files on disk, but the database JSON always references `.jpg`:
- `inland-taipan` — PNG 20KB vs JPG 32KB
- `black-mamba` — PNG 8KB vs JPG 28KB
- `king-cobra` — PNG 12KB vs JPG 16KB
- `gaboon-viper` — PNG (exists) vs JPG (referenced)
- `reticulated-python` — PNG (exists) vs JPG (referenced)

The PNG versions are **smaller** (likely exported at lower quality), meaning the JPGs being served are larger than necessary. The PNGs appear to be leftover from an earlier image pipeline attempt.

**Fix**: Delete the orphaned `.png` files to remove confusion. If smaller file sizes are desirable, re-export the thumbnails as WebP via the image pipeline.

### 14f. `sizes` Prop Does Not Adapt to Breakpoints

The current `sizes="400px"` is a static hint. On mobile, the image takes up the full viewport width (could be 390px on iPhone 15 or 428px on iPhone 15 Plus). On desktop, it's capped at the 360px column.

**Fix**: Use a responsive sizes string:
```tsx
sizes="(max-width: 640px) 100vw, 360px"
```
This tells Next.js to serve full-width images on mobile (so they're not under-served) and 360px on desktop.

### 14g. No `alt` Text Strategy for Screen Readers

The `alt={snake.commonName}` is technically correct but in a ranked list context, more descriptive alt text would be:
```
"#1 — Inland Taipan"
```
This way screen reader users scanning through the list know both the rank and the species from the image alt.

---

## Priority Order

| Priority | Fix |
|---|---|
| P0 — Bug | Column alignment mismatch (header vs. row grid) |
| P0 — Performance | Add `priority` prop to top 8 row images (LCP fix) |
| P1 — High impact | Thumbnail upscaling: fix `sizes` to `(max-width: 640px) 100vw, 360px` |
| P1 — High impact | Score column: add progress bar + fix potency color |
| P1 — High impact | Potency "Notes" column: replace static text with real data |
| P1 — High impact | Typography: eliminate sub-12px text, standardize scale |
| P1 — Visual | Set `objectPosition="top"` on row images to show snake heads |
| P2 — Polish | View toggle: segmented control pattern |
| P2 — Polish | Top 3 rank visual treatment |
| P2 — Polish | Back navigation: chevron + cleaner layout |
| P2 — Performance | Remove double-fetch glow effect or replace with `<Image>` |
| P3 — Minor | Delete 5 orphaned PNG thumbnails |
| P3 — Minor | Footer copy and emoji cleanup |
| P3 — Minor | Image fallback: SVG instead of emoji |
| P3 — Minor | Controls bar bg unification |
| P3 — Minor | Result count indicator |
| P3 — Minor | Improve `alt` text to include rank number |
