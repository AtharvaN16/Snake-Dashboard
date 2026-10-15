# Visualization Opportunities

Ideas for improving data visualization across the snake dashboard.

---

## Danger Score Visualization

The danger score formula (`dangerScore = intrinsic × encounterModifier`) is a product of two independent dimensions, which maps naturally to an x,y coordinate system.

### Scatter Plot — Rankings Page (Intrinsic vs Encounter)

**X-axis**: Intrinsic score (0–100) — how deadly the venom is
**Y-axis**: Encounter modifier (0.6–1.0) — how likely you are to meet it

Each snake is a point. Iso-score curves are hyperbolas (intrinsic × modifier = constant). Four natural quadrants emerge:

|  | Low Encounter | High Encounter |
|---|---|---|
| **High Intrinsic** | Inland Taipan (deadly but remote) | Russell's Viper (deadly AND common) |
| **Low Intrinsic** | Vine snakes (harmless, rare) | Brown Tree Snake (harmless but common) |

This communicates the formula's core thesis — encounter amplifies danger but can't create it — visually. Dot size encodes danger score, color encodes venom classification.

### Radar Diagram — Detail Page (Component Profile)

4 axes: lethality, clinical severity, speed, encounter. Shows the "shape" of a snake's danger profile. A Black Mamba's shape (huge clinical, moderate lethality) looks completely different from an Inland Taipan's (huge lethality, low encounter). Replaces or supplements the current segmented bar with something more intuitive.

### Segmented Bar — Detail Page (Keep Current)

The existing segmented bar is still useful for showing exact weighted point contributions. Works well alongside the radar as a secondary breakdown.

### Lollipop Chart — Rankings List View

Cleaner than bar charts for ranked lists. Dot at the score, stem to zero, sorted by rank. Good alternative to the current ranking display.

---

## Other Visualization Opportunities

### A. Choropleth Map — "Danger by Region"

**Where**: New page or homepage feature
**Data**: `continent`, `subregions`, `dangerScore` per snake
**Concept**: Color-code a world map by average/max danger score per region. Southeast Asia and Sub-Saharan Africa would light up. Users click a region to see its snakes. Compelling entry point for exploration.

### B. Parallel Coordinates — Snake Comparison Tool

**Where**: New comparison feature
**Data**: 6+ numeric dimensions (lethality, clinical, speed, encounter, potency, yield)
**Concept**: Select 2–4 snakes and overlay their profiles as polylines crossing parallel axes. Answers: "How does King Cobra compare to Black Mamba?" Powerful for multi-dimensional comparison.

### C. Matrix/Heatmap — Venom Type × Family

**Where**: Phylogeny or rankings page
**Data**: `venomTypes` (Hemotoxic, Neurotoxic, Cytotoxic, Myotoxic), `family`
**Concept**: Heatmap showing which families produce which venom types. Reveals patterns — Elapidae is overwhelmingly neurotoxic, Viperidae is mostly hemotoxic. Educational and visually striking.

### D. Symptom Timeline — Progression Visualization

**Where**: Detail page
**Data**: `symptomsProgression` (shortTerm, progressive, critical arrays), `venomSpeed`
**Concept**: Horizontal timeline/flow diagram showing symptoms appearing over time (minutes → hours → days). A Gantt-style chart replacing the current chip-based display. Much more impactful for understanding envenomation progression.

### E. Sankey Diagram — Danger Score Decomposition

**Where**: Detail page (alternative to waterfall)
**Data**: Venom type → LD50/Yield → Lethality Score → Clinical Score → Final Danger Score
**Concept**: Shows how raw venom attributes flow through scoring stages into the composite danger score. More narrative than the existing waterfall chart — users can trace how a snake's specific traits (e.g., high potency but low yield) combine into the final number. Connecting widths encode point contribution at each stage.

### F. Violin Plot / Boxplot — LD50 Distribution by Family

**Where**: Rankings or phylogeny page
**Data**: `venomPotency.ld50Normalized` grouped by `family`
**Concept**: Shows the spread and density of potency values within each taxonomic family. Reveals which families are consistently potent (tight, low distributions like Elapidae) vs. highly variable. Boxplot variant works if sample sizes are small. Gives population-level context that individual LD50 numbers lack.

### G. Stream Graph — Venom Type Prevalence Across Taxonomy

**Where**: Phylogeny page
**Data**: `venomTypes` distribution across families/genera
**Concept**: Flowing stacked area chart showing how venom type prevalence shifts across the taxonomic tree. Each "stream" is a venom type (hemotoxic, neurotoxic, cytotoxic, myotoxic). Visually striking and reveals evolutionary transitions — e.g., the neurotoxic dominance in Elapidae giving way to hemotoxic in Viperidae.

### H. Contour / Density Plot — Potency × Yield Landscape

**Where**: Detail page (overlay on existing scatter plot)
**Data**: `venomPotency.ld50Normalized`, `venomYield.dryWeight` across all species
**Concept**: 2D density contours overlaid on the existing Lethality Scatter Plot, showing where snakes cluster in potency-yield space. Highlights the "normal" zone vs. outliers. Current snake's position gains more context when you can see the density landscape around it.

### I. Treemap — Species Distribution by Family

**Where**: Homepage or phylogeny page
**Data**: Family → genus → species hierarchy, `dangerScore`
**Concept**: Tile size proportional to danger score. Most dangerous families visually dominate. Offers a different perspective from the existing sunburst phylogeny chart.

---

## Quick Wins

Low-effort additions using data fields that already exist but aren't visualized:

| Visualization | Data Field | Where | Notes |
|---|---|---|---|
| Data Quality indicator | `dataQuality` (measured / estimated / insufficient) | Detail page | Badge or icon showing confidence level of the danger score |
| LD50 normalization badge | `venomPotency.normalized` boolean | Detail page | Flag showing whether LD50 was converted from another method |
| Encounter frequency histogram | `humanEncounterChance` across all species | Rankings page | Distribution of encounter levels across the dataset |
| CFR range comparison | `clinicalData.untreatedFatalityRate` (low/high) | Rankings page | Range bars showing fatality rate uncertainty per snake |

---

## Priority Ranking

| Priority | Visualization | Impact | Effort |
|---|---|---|---|
| 1 | Scatter plot (rankings page) | High — directly communicates formula logic | Medium |
| 2 | Radar diagram (detail page) | High — intuitive component breakdown | Medium |
| 3 | Choropleth "danger by region" | High — visually compelling, great for engagement | High |
| 4 | Symptom timeline (detail page) | High — much better than current chips | Medium |
| 5 | Sankey diagram (detail page) | Medium — narrative score decomposition | Medium |
| 6 | Parallel coordinates (comparison) | Medium — powerful but niche use case | High |
| 7 | Heatmap venom × family | Medium — educational value | Low |
| 8 | Violin plot LD50 by family | Medium — population-level potency context | Medium |
| 9 | Stream graph (phylogeny) | Medium — visually striking evolutionary view | High |
| 10 | Contour/density overlay | Low — enhances existing scatter plot | Low |
| 11 | Treemap by family | Low — sunburst already covers this | Medium |
| 12 | Quick wins (badges/indicators) | Low individually, good polish | Very Low |
