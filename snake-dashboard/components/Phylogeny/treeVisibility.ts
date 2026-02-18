import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import { SPECIES_ZOOM_THRESHOLD, SPECIES_LABEL_ZOOM } from "./treeConstants";
import { nodeRadius, fontSize } from "./treeNodeStyles";

interface VisibilityContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodeColor: (n: d3.HierarchyNode<HierarchyNode>) => string;
  isSpecies: (d: d3.HierarchyNode<HierarchyNode>) => boolean;
  currentSnakeId?: string;
  getClickFocusNode: () => d3.HierarchyPointNode<HierarchyNode> | null;
  getSearchHighlightNode: () => d3.HierarchyPointNode<HierarchyNode> | null;
  getHoverActive: () => boolean;
}

export function createUpdateSpeciesVisibility(ctx: VisibilityContext) {
  const { svg, g, nodeColor, isSpecies, currentSnakeId } = ctx;

  return function updateSpeciesVisibility(scale: number) {
    (svg.node() as any).__currentZoomScale = scale;
    if (ctx.getHoverActive()) return;
    const show = scale >= SPECIES_ZOOM_THRESHOLD;
    const showLabels = scale >= SPECIES_LABEL_ZOOM;

    g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(".species-node")
      .style("opacity", show ? "1" : "0")
      .style("pointer-events", show ? "auto" : "none");
    g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(".species-link")
      .attr("stroke-opacity", show ? 0.7 : 0);
    g.selectAll(".species-label").attr("opacity", showLabels ? 1 : 0);

    const invK = 1 / scale;
    const isZoomedIn = !!ctx.getClickFocusNode() || !!ctx.getSearchHighlightNode();
    const MIN_READABLE_PX = 8;

    g.selectAll(".ext-label").remove();

    g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(".node, .species-node")
      .each(function (nd) {
        const nodeEl = d3.select(this);
        const rank = nd.data.rank ?? "";
        const isHigherRank = rank === "suborder" || rank === "infraorder" || rank === "clade" || rank === "family";
        const isHighlighted = !!currentSnakeId && nd.data.id === currentSnakeId;
        const inNodeText = nodeEl.select<SVGTextElement>("text");

        if (isHighlighted) return;
        if (!isHigherRank && !isZoomedIn) {
          inNodeText.attr("opacity", showLabels || !isSpecies(nd) ? 1 : 0);
          return;
        }

        const fs = fontSize(nd);
        const screenPx = fs * scale;

        if (screenPx < MIN_READABLE_PX) {
          inNodeText.attr("opacity", 0);
          const r = nodeRadius(nd);
          const gap = r + 24 * invK;
          const extFs = 12 * invK;
          const extPadX = 6 * invK;
          const extPadY = 3 * invK;
          const extRx = 4 * invK;

          const extG = nodeEl.append("g")
            .attr("class", "ext-label")
            .attr("transform", `translate(0, ${-gap})`);
          const extText = extG.append("text")
            .attr("text-anchor", "middle")
            .attr("font-size", `${extFs}px`)
            .attr("font-weight", "500")
            .attr("fill", nodeColor(nd))
            .attr("y", 0)
            .attr("dy", "0.35em")
            .text(nd.data.name);
          const bb = (extText.node() as SVGTextElement).getBBox();
          extG.insert("rect", "text")
            .attr("x", bb.x - extPadX)
            .attr("y", bb.y - extPadY)
            .attr("width", bb.width + extPadX * 2)
            .attr("height", bb.height + extPadY * 2)
            .attr("rx", extRx)
            .attr("fill", "#fff")
            .attr("fill-opacity", 0.85);
        } else {
          inNodeText.attr("opacity", 1);
        }
      });
  };
}
