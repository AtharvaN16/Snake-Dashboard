import type { HierarchyNode } from "@/lib/snakeTaxonomy";

export interface Props {
  root: HierarchyNode;
  currentSnakeId?: string;
}

export const RADIUS = 2800;
export const SPECIES_ZOOM_THRESHOLD = 0;
export const SPECIES_LABEL_ZOOM = 0;

export const BLOOM_BASE_DELAY = 200;
export const BLOOM_DURATION = 600;

// Families — warm-to-cool spectrum, high contrast between neighbors
export const FAMILY_PALETTE = [
  "#c44e52", // muted red
  "#4c72b0", // classic blue
  "#55a868", // fern green
  "#dd8452", // burnt orange
  "#8172b3", // wisteria
  "#937860", // khaki
  "#da8bc3", // orchid pink
  "#8c8c8c", // neutral grey
  "#ccb974", // dark goldenrod
  "#64b5cd", // sky blue
];

// Each rank gets its own distinct hue
export const RANK_COLORS: Record<string, string> = {
  suborder: "#2d3436",   // charcoal
  infraorder: "#6c5ce7", // soft purple
  clade: "#00b894",      // mint
};
