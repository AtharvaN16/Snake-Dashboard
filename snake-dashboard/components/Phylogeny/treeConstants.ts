import type { HierarchyNode } from "@/lib/snakeTaxonomy";

export interface Props {
  root: HierarchyNode;
  currentSnakeId?: string;
}

export const RADIUS = 2800;
export const SPECIES_ZOOM_THRESHOLD = 0;
export const SPECIES_LABEL_ZOOM = 0;
/** Zoom scale above which genus/species get external labels above nodes */
export const GENUS_SPECIES_LABEL_ZOOM = 0.5;

export const BLOOM_BASE_DELAY = 200;
export const BLOOM_DURATION = 600;

/** Maximum radial extension (in tree units) for the highest-potency species (Inland Taipan, score 100). */
export const MAX_POTENCY_EXTENSION = 1200;

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
  clade: "#00b894",      // mint
};
