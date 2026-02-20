import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import { SPECIES_ZOOM_THRESHOLD, GENUS_SPECIES_LABEL_ZOOM } from "./treeConstants";
import { radialPoint } from "./treeGeometry";
import { nodeRadius, fontSize } from "./treeNodeStyles";

interface VisibilityContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  labelsLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodeColor: (n: d3.HierarchyNode<HierarchyNode>) => string;
  isSpecies: (d: d3.HierarchyNode<HierarchyNode>) => boolean;
  currentSnakeId?: string;
  zoomScaleRef: { current: number };
  getClickFocusNode: () => d3.HierarchyPointNode<HierarchyNode> | null;
  getSearchHighlightNode: () => d3.HierarchyPointNode<HierarchyNode> | null;
  getHoverActive: () => boolean;
  getHoveredNode: () => d3.HierarchyPointNode<HierarchyNode> | null;
  getHighlightedNodes: () => Set<d3.HierarchyNode<HierarchyNode>>;
  getDimmedOpacity: () => { node: string; link: number };
}

/** Ext-label font size by rank — family > genus > species. large=true for snake search highlight. */
function extLabelSize(rank: string, invK: number, large = false): number {
  const m = large ? 1.2 : 1;
  if (rank === "family") return 13 * invK * m;
  if (rank === "genus") return 11 * invK * m;
  if (rank === "species") return 9 * invK * m;
  return 12 * invK * m; // suborder, infraorder, clade
}

export function createUpdateSpeciesVisibility(ctx: VisibilityContext) {
  const { svg, g, nodeColor, isSpecies, currentSnakeId } = ctx;

  return function updateSpeciesVisibility(scale: number) {
    ctx.zoomScaleRef.current = scale;
    const hoverActive = ctx.getHoverActive();
    const highlightedNodes = ctx.getHighlightedNodes();
    const dimmedOpacity = ctx.getDimmedOpacity();
    const labelOpacityFor = (nd: d3.HierarchyNode<HierarchyNode>) =>
      hoverActive ? (highlightedNodes.has(nd) ? "1" : dimmedOpacity.node) : "1";

    // Species visibility is controlled by highlight when hover/click is active
    if (!hoverActive) {
      const show = scale >= SPECIES_ZOOM_THRESHOLD;
      g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(".species-node")
        .style("opacity", show ? "1" : "0")
        .style("pointer-events", show ? "auto" : "none");
      g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(".species-link")
        .attr("stroke-opacity", show ? 0.7 : 0);
    }

    const invK = 1 / scale;
    const clickFocusNode = ctx.getClickFocusNode();
    const searchHighlightNode = ctx.getSearchHighlightNode();
    const isClickFocused = !!clickFocusNode;
    const isSearchHighlighted = !!searchHighlightNode;

    let showLabelsOnFocus = false;
    if (isClickFocused) {
      const rank = clickFocusNode!.data.rank;
      const isHenophidia = clickFocusNode!.data.name === "Henophidia";
      if (rank === "family" || rank === "genus" || rank === "species" || isHenophidia) {
        showLabelsOnFocus = true;
      }
    }
    if (isSearchHighlighted) {
      showLabelsOnFocus = true;
    }

    const isScaleZoomed = scale >= GENUS_SPECIES_LABEL_ZOOM;
    const hovered = ctx.getHoveredNode();
    const hoveredIsSpecies = hovered && ctx.isSpecies(hovered);
    const showGenusSpeciesLabels =
      showLabelsOnFocus ||
      (isScaleZoomed && !isClickFocused && !isSearchHighlighted) ||
      (hoverActive && !!hoveredIsSpecies);
    const useSideLabels = (isClickFocused || isSearchHighlighted) && !hoveredIsSpecies;
    const MIN_READABLE_PX = 8;

    ctx.labelsLayer.selectAll(".ext-label").remove();

    g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(".node, .species-node")
      .each(function (nd) {
        const nodeEl = d3.select<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(this);
        const rank = nd.data.rank ?? "";
        const isHigherRank = rank === "suborder" || rank === "infraorder" || rank === "clade" || rank === "family";
        const isGenusOrSpecies = rank === "genus" || rank === "species";
        const isHighlighted = !!currentSnakeId && nd.data.id === currentSnakeId;
        const inNodeText = nodeEl.select<SVGTextElement>("text");

        if (isHighlighted) return;

        // Genus/species: no in-node labels; show ext-labels
        if (isGenusOrSpecies) {
          if (!showGenusSpeciesLabels) return;
          // When hovering a species, only show path (species + parent genus) above
          if (hoveredIsSpecies) {
            if (nd === hovered) {
              addExtLabel(ctx.labelsLayer, nd, rank, invK, scale, { lightStyle: false }, labelOpacityFor(nd));
            } else if (rank === "genus" && hovered!.parent === nd) {
              addExtLabel(ctx.labelsLayer, nd, rank, invK, scale, { lightStyle: true }, labelOpacityFor(nd));
            }
          } else {
            // Snake search highlight: genus in path gets label at top, larger labels
            const searchNode = ctx.getSearchHighlightNode();
            const genusInSearchPath =
              rank === "genus" && searchNode && searchNode.parent === nd;
            const useTopForGenus = genusInSearchPath;
            const inSearchPath = searchNode && (nd === searchNode || nd === searchNode.parent);
            addExtLabel(ctx.labelsLayer, nd, rank, invK, scale, {
              side: useTopForGenus ? false : useSideLabels,
              large: !!inSearchPath,
            }, labelOpacityFor(nd));
          }
          return;
        }

        // Higher ranks: show ext-label when in-node text is too small
        if (!isHigherRank) return;
        const fs = fontSize(nd);
        const screenPx = fs * scale;
        const isDirectChildOfHenophidia =
          clickFocusNode?.data.name === "Henophidia" && nd.parent === clickFocusNode;

        // Click-focused higher rank (family, clade, infraorder, suborder): always show light label (Pythonidae, Henophidia, etc.)
        if (nd === clickFocusNode) {
          inNodeText.attr("opacity", 0);
          addExtLabel(ctx.labelsLayer, nd, rank, invK, scale, { lightStyle: true }, labelOpacityFor(nd));
          return;
        }

        // Family when zoomed in: add light label for other families (Boidae, Pythonidae, etc.)
        if (rank === "family" && isScaleZoomed) {
          inNodeText.attr("opacity", 0);
          addExtLabel(ctx.labelsLayer, nd, rank, invK, scale, { lightStyle: true }, labelOpacityFor(nd));
          return;
        }

        if (isDirectChildOfHenophidia || screenPx < MIN_READABLE_PX) {
          inNodeText.attr("opacity", 0);
          addExtLabel(ctx.labelsLayer, nd, rank, invK, scale, { side: !!isDirectChildOfHenophidia }, labelOpacityFor(nd));
        } else {
          inNodeText.attr("opacity", 1);
        }
      });
  };

  /**
   * Radial tree label placement (D3 convention):
   * - When side=true: place labels radially outward from node, rotate to align, counter-rotate
   *   when angle >= π so text stays upright. This naturally spaces labels and reduces overlap.
   * - When side=false: place above node (hover path labels).
   * Labels are appended to labelsLayer so they render on top of all nodes (no dimmed circles showing through).
   * labelOpacity syncs with node highlight (1 for path, 0 or 0.2 for dimmed).
   */
  function addExtLabel(
    labelsLayer: d3.Selection<SVGGElement, unknown, null, undefined>,
    nd: d3.HierarchyPointNode<HierarchyNode>,
    rank: string,
    invK: number,
    _scale: number,
    opts: { lightStyle?: boolean; side?: boolean; large?: boolean } = {},
    labelOpacity = "1",
  ) {
    const { lightStyle = false, side = false, large = false } = opts;
    const r = nodeRadius(nd);
    const gap = r + 20 * invK;
    const extFs = extLabelSize(rank, invK, large);
    const extPadX = 6 * invK;
    const extPadY = 3 * invK;
    const extRx = 4 * invK;
    const angle = (nd as any).x ?? 0;

    let relativeTransform: string;
    let textAnchor: string;
    let textX: number;

    if (side) {
      // Radial placement: rotate to node angle, translate along radial axis (gap from node center),
      // counter-rotate for readability. Use translate(gap,0) since +x points outward after rot1.
      const rot1 = (angle * 180) / Math.PI - 90;
      const rot2 = angle >= Math.PI ? 180 : 0;
      relativeTransform = `rotate(${rot1}) translate(${gap},0) rotate(${rot2})`;
      textAnchor = angle < Math.PI ? "start" : "end";
      textX = angle < Math.PI ? extPadX : -extPadX;
    } else {
      relativeTransform = `translate(0,${-gap})`;
      textAnchor = "middle";
      textX = 0;
    }

    const [px, py] = radialPoint((nd as any).x, (nd as any).y);
    const fullTransform = `translate(${px},${py}) ${relativeTransform}`;

    const extG = labelsLayer.append("g")
      .attr("class", "ext-label")
      .attr("transform", fullTransform)
      .style("pointer-events", "none")
      .style("opacity", labelOpacity);
    const extText = extG.append("text")
      .attr("text-anchor", textAnchor)
      .attr("font-size", `${extFs}px`)
      .attr("font-weight", "500")
      .style("font-style", rank === "genus" || rank === "species" ? "italic" : "normal")
      .attr("fill", nodeColor(nd))
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("x", textX)
      .text(nd.data.name);
    const bb = (extText.node() as SVGTextElement).getBBox();
    extG.insert("rect", "text")
      .attr("x", bb.x - extPadX)
      .attr("y", bb.y - extPadY)
      .attr("width", bb.width + extPadX * 2)
      .attr("height", bb.height + extPadY * 2)
      .attr("rx", extRx)
      .attr("fill", lightStyle ? "#f8fafc" : "#fff")
      .attr("fill-opacity", 1)
      .attr("opacity", 1);
  }
}
