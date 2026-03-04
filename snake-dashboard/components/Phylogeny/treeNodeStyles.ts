import type { HierarchyNode as D3HierarchyNode } from "d3-hierarchy";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import { lightTint } from "./treeGeometry";

export type ColorMode = "family" | "venom";

export function nodeRadius(d: D3HierarchyNode<HierarchyNode>): number {
  switch (d.data.rank) {
    case "suborder":
      return 220;
    case "infraorder":
      return d.children && d.children.length > 0 ? 140 : 80;
    case "clade":
      return 88; // clades > families in visual hierarchy
    case "family":
      return 68;
    case "genus":
      return 50;
    case "species":
      return 28;
    default:
      return 30;
  }
}

export function fontSize(d: D3HierarchyNode<HierarchyNode>): number {
  switch (d.data.rank) {
    case "suborder":
      return 56;
    case "infraorder":
      return d.children && d.children.length > 0 ? 36 : 22;
    case "clade":
      return 32;
    case "family":
      return 24;
    case "genus":
      return 13;
    case "species":
      return 9;
    default:
      return 12;
  }
}

export function fontWeight(d: D3HierarchyNode<HierarchyNode>): string {
  switch (d.data.rank) {
    case "suborder":
      return "700";
    case "infraorder":
    case "clade":
    case "family":
      return "600";
    default:
      return "normal";
  }
}

/** Depth-based branch width — gentle taper so outer florets stay visibly thick. */
export function linkWidth(depth: number): number {
  return Math.max(5, 44 - depth * 3);
}

/** Compute node fill color — single source of truth for both render and update paths. */
export function computeNodeFill(
  d: D3HierarchyNode<HierarchyNode>,
  nodeColor: (n: D3HierarchyNode<HierarchyNode>) => string,
  colorMode: ColorMode,
  currentSnakeId?: string,
): string {
  const color = nodeColor(d);
  const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
  if (colorMode === "venom" && d.data.rank === "species") {
    return color;
  }
  return isCurrent ? color : lightTint(color, 0.82);
}

/** Hover appearance per view — single place to extend when adding new views. */
export function getNodeHoverStyle(
  colorMode: ColorMode,
  d: D3HierarchyNode<HierarchyNode>,
  nodeColor: (n: D3HierarchyNode<HierarchyNode>) => string,
  currentSnakeId?: string,
): { fill: string; fillOpacity: number } {
  if (colorMode === "venom" && d.data.rank === "species") {
    return {
      fill: computeNodeFill(d, nodeColor, "venom", currentSnakeId),
      fillOpacity: 1,
    };
  }
  return {
    fill: nodeColor(d),
    fillOpacity: 0.85,
  };
}
