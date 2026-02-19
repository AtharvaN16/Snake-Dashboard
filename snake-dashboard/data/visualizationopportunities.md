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

### E. Treemap — Species Distribution by Family

**Where**: Homepage or phylogeny page
**Data**: Family → genus → species hierarchy, `dangerScore`
**Concept**: Tile size proportional to danger score. Most dangerous families visually dominate. Offers a different perspective from the existing sunburst phylogeny chart.

---

## Priority Ranking

| Priority | Visualization | Impact | Effort |
|---|---|---|---|
| 1 | Scatter plot (rankings page) | High — directly communicates formula logic | Medium |
| 2 | Radar diagram (detail page) | High — intuitive component breakdown | Medium |
| 3 | Choropleth "danger by region" | High — visually compelling, great for engagement | High |
| 4 | Symptom timeline (detail page) | Medium — better than current chips | Medium |
| 5 | Parallel coordinates (comparison) | Medium — powerful but niche use case | High |
| 6 | Heatmap venom × family | Medium — educational value | Low |
| 7 | Treemap by family | Low — sunburst already covers this | Medium |
