import type { HierarchyNode } from "@/lib/snakeTaxonomy";

export interface Props {
  root: HierarchyNode;
  currentSnakeId?: string;
}

export const RADIUS = 2800;
/** Empty center circle radius — prevents all branches converging at one point (donut shape). */
export const INNER_RADIUS = 280;
export const SPECIES_ZOOM_THRESHOLD = 0;
export const SPECIES_LABEL_ZOOM = 0;
/** Zoom scale above which genus/species get external labels above nodes */
export const GENUS_SPECIES_LABEL_ZOOM = 0.5;

export const BLOOM_BASE_DELAY = 200;
export const BLOOM_DURATION = 600;

/** Maximum radial extension (in tree units) for the highest-potency species (Inland Taipan, score 100). */
export const MAX_POTENCY_EXTENSION = 1800;

// Pinned family → color map (stable regardless of insertion order)
export const FAMILY_COLOR_MAP: Record<string, string> = {
  Boidae:          "#c44e52", // muted red
  Colubridae:      "#4c72b0", // classic blue
  Elapidae:        "#55a868", // fern green
  Pythonidae:      "#dd8452", // burnt orange
  Viperidae:       "#8172b3", // wisteria
  Atractaspididae: "#64b5cd", // sky blue
};

// Fallback palette for families not yet in FAMILY_COLOR_MAP
const FALLBACK_PALETTE = ["#937860", "#da8bc3", "#8c8c8c", "#ccb974"];
let _fallbackIdx = 0;
const _dynamicMap = new Map<string, string>();

/** Look up the colour for a family name, with stable fallback. */
export function familyColor(family: string): string {
  if (FAMILY_COLOR_MAP[family]) return FAMILY_COLOR_MAP[family];
  if (!_dynamicMap.has(family)) {
    _dynamicMap.set(family, FALLBACK_PALETTE[_fallbackIdx % FALLBACK_PALETTE.length]);
    _fallbackIdx++;
  }
  return _dynamicMap.get(family)!;
}

// Each rank gets its own distinct hue
export const RANK_COLORS: Record<string, string> = {
  suborder: "#2d3436",   // charcoal
  infraorder: "#6c5ce7", // soft purple
  clade: "#00b894",      // mint fallback
};

/**
 * Per-clade colors tinted toward the dominant family group they contain.
 * Makes nested clade relationships visually legible.
 */
export const NAMED_CLADE_COLORS: Record<string, string> = {
  Afrophidia:    "#8b9d77",  // muted olive (broad Gondwanan grouping)
  Macrostomata:  "#c4956a",  // warm amber (large-mouth snakes)
  Pythonoidea:   "#dd8452",  // burnt orange → matches Pythonidae
  Booidea:       "#c44e52",  // muted red   → matches Boidae
  Caenophidia:   "#00b894",  // teal        → canonical advanced-snake colour
  Colubroides:   "#1a9e7f",  // deeper teal
  Colubroidea:   "#4c72b0",  // steel blue  → matches Colubridae
  Elapoidea:     "#55a868",  // fern green  → matches Elapidae
};

/** Extra radial distance between parent and child at key branches (visual breathing room). */
export const CLADE_GAP_AFROPHIDIA_MACROSTOMATA = 320;
export const CLADE_GAP_CAENOPHIDIA_COLUBROIDES = 280;
export const CLADE_GAP_BOOIDEA_BOIDAE = 240;
export const CLADE_GAP_PYTHONOIDEA_PYTHONIDAE = 240;

