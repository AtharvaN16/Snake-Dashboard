import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import { BLOOM_BASE_DELAY, BLOOM_DURATION } from "./treeConstants";
import { radialPoint, lightTint } from "./treeGeometry";
import { nodeRadius } from "./treeNodeStyles";
import { createUpdateSpeciesVisibility } from "./treeVisibility";

export interface ChartContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodeSelection: d3.Selection<SVGGElement, d3.HierarchyPointNode<HierarchyNode>, SVGGElement, unknown>;
  linkSelection: d3.Selection<SVGPathElement, d3.HierarchyPointLink<HierarchyNode>, SVGGElement, unknown>;
  nodeToAncestors: Map<d3.HierarchyNode<HierarchyNode>, Set<d3.HierarchyNode<HierarchyNode>>>;
  nodeColor: (n: d3.HierarchyNode<HierarchyNode>) => string;
  isSpecies: (d: d3.HierarchyNode<HierarchyNode>) => boolean;
  currentSnakeId?: string;
  shouldBloom: boolean;
  cw: number;
  ch: number;
  cx: number;
  cy: number;
  scale0: number;
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
}

export function setupInteractions(ctx: ChartContext): { cleanup: () => void; updateSpeciesVisibility: (scale: number) => void } {
  const {
    svg, g, nodeSelection, linkSelection, nodeToAncestors,
    nodeColor, isSpecies, currentSnakeId, shouldBloom,
    cw, ch, cx, cy, scale0, zoomBehavior,
  } = ctx;

  let hoverActive = false;
  let searchHighlightNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let clickFocusNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let hoverLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let searchLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

  if (currentSnakeId) {
    const allNodes = nodeSelection.data();
    const found = allNodes.find((n) => n.data.id === currentSnakeId);
    searchHighlightNode = found ?? null;
  }

  // --- Highlight helpers ---

  function highlightSubtree(target: d3.HierarchyPointNode<HierarchyNode>) {
    hoverActive = true;
    const subtreeNodes = new Set<d3.HierarchyNode<HierarchyNode>>();
    target.each((n) => subtreeNodes.add(n));

    nodeSelection
      .transition().duration(250)
      .style("opacity", (d) => (subtreeNodes.has(d) ? "1" : "0.05"));
    nodeSelection
      .style("pointer-events", (d) => (subtreeNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(250)
      .attr("stroke-opacity", (l) =>
        subtreeNodes.has(l.source) && subtreeNodes.has(l.target) ? 0.9 : 0.02
      );
  }

  function highlightPath(target: d3.HierarchyNode<HierarchyNode>) {
    hoverActive = true;
    const ancestors = nodeToAncestors.get(target)!;
    const pathNodes = new Set(ancestors);
    pathNodes.add(target);

    nodeSelection
      .transition().duration(200)
      .style("opacity", (d) => (pathNodes.has(d) ? "1" : "0.05"));
    nodeSelection
      .style("pointer-events", (d) => (pathNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(200)
      .attr("stroke-opacity", (d) =>
        pathNodes.has(d.source) && pathNodes.has(d.target) ? 0.9 : 0.02
      );
  }

  const updateSpeciesVisibility = createUpdateSpeciesVisibility({
    svg, g, nodeColor, isSpecies, currentSnakeId,
    getClickFocusNode: () => clickFocusNode,
    getSearchHighlightNode: () => searchHighlightNode,
    getHoverActive: () => hoverActive,
  });

  function clearHighlight() {
    if (clickFocusNode) { highlightSubtree(clickFocusNode); return; }
    if (searchHighlightNode) { highlightPath(searchHighlightNode); return; }
    hoverActive = false;
    const currentZoom = (svg.node() as any).__currentZoomScale || 1;

    nodeSelection.style("pointer-events", "auto");
    nodeSelection.transition().duration(300).style("opacity", "1");
    linkSelection.transition().duration(300).attr("stroke-opacity", 0.7);
    updateSpeciesVisibility(currentZoom);
  }

  // --- Floating label helper ---

  function createLabel(parent: d3.Selection<SVGGElement, unknown, null, undefined>, node: d3.HierarchyPointNode<HierarchyNode>, cls: string) {
    const color = nodeColor(node);
    const r = nodeRadius(node);
    const [px, py] = radialPoint((node as any).x, (node as any).y);
    const k = (svg.node() as any).__currentZoomScale || 1;
    const invK = 1 / k;
    const gap = r + 24 * invK;
    const labelG = parent.append("g").attr("class", cls).attr("transform", `translate(${px},${py - gap})`);
    const fs = 14 * invK, padX = 8 * invK, padY = 5 * invK, rx = 6 * invK;
    const text = labelG.append("text")
      .attr("text-anchor", "middle").attr("font-size", `${fs}px`).attr("font-weight", "600")
      .attr("fill", "#fff").attr("y", 0).attr("dy", "0.35em").text(node.data.name);
    const bbox = (text.node() as SVGTextElement).getBBox();
    labelG.insert("rect", "text")
      .attr("x", bbox.x - padX).attr("y", bbox.y - padY)
      .attr("width", bbox.width + padX * 2).attr("height", bbox.height + padY * 2)
      .attr("rx", rx).attr("fill", color).attr("opacity", 0.92);
    return labelG;
  }

  // --- Hover effects ---

  function showHoverEffect(el: SVGGElement, d: d3.HierarchyPointNode<HierarchyNode>) {
    const color = nodeColor(d);
    d3.select(el).select<SVGElement>("circle, path").attr("fill", color).attr("fill-opacity", 0.85);
    const extLabel = d3.select(el).select(".ext-label");
    if (!extLabel.empty()) {
      extLabel.select("rect").attr("fill", color).attr("fill-opacity", 0.92);
      extLabel.select("text").attr("fill", "#fff").attr("font-weight", "600");
      return;
    }
    hoverLabel = createLabel(g, d, "hover-label");
  }

  function clearHoverEffect(el: SVGGElement, d: d3.HierarchyPointNode<HierarchyNode>) {
    const color = nodeColor(d);
    const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
    const fill = isCurrent ? color : lightTint(color, 0.82);
    d3.select(el).select<SVGElement>("circle, path").attr("fill", fill).attr("fill-opacity", isCurrent ? 0.85 : 1);
    const extLabel = d3.select(el).select(".ext-label");
    if (!extLabel.empty()) {
      extLabel.select("rect").attr("fill", "#fff").attr("fill-opacity", 0.85);
      extLabel.select("text").attr("fill", color).attr("font-weight", "500");
    }
    if (hoverLabel) { hoverLabel.remove(); hoverLabel = null; }
  }

  // --- Zoom helpers ---

  function zoomToBounds(nodes: Iterable<d3.HierarchyNode<HierarchyNode>>, padding: number, maxScale: number) {
    let tx0 = Infinity, ty0 = Infinity, tx1 = -Infinity, ty1 = -Infinity;
    for (const n of nodes) {
      const [px, py] = radialPoint((n as any).x, (n as any).y);
      const r = nodeRadius(n);
      tx0 = Math.min(tx0, px - r); ty0 = Math.min(ty0, py - r);
      tx1 = Math.max(tx1, px + r); ty1 = Math.max(ty1, py + r);
    }
    tx0 -= padding; ty0 -= padding; tx1 += padding; ty1 += padding;
    const tscale = Math.min(cw / (tx1 - tx0), ch / (ty1 - ty0), maxScale);
    const tcx = (tx0 + tx1) / 2, tcy = (ty0 + ty1) / 2;
    svg.transition().duration(750).ease(d3.easeCubicInOut)
      .call((zoomBehavior as any).transform,
        d3.zoomIdentity.translate(cw / 2 - tcx * tscale, ch / 2 - tcy * tscale).scale(tscale));
  }

  function zoomToNode(target: d3.HierarchyPointNode<HierarchyNode>) {
    const nodes: d3.HierarchyNode<HierarchyNode>[] = [];
    target.each((n) => nodes.push(n));
    zoomToBounds(nodes, 100, 4);
  }

  function zoomToPath(target: d3.HierarchyPointNode<HierarchyNode>) {
    const ancestors = nodeToAncestors.get(target)!;
    const pathNodes = new Set(ancestors);
    pathNodes.add(target);
    zoomToBounds(pathNodes, 500, 0.8);
  }

  function addSearchLabel(node: d3.HierarchyPointNode<HierarchyNode>) {
    searchLabel = createLabel(g, node, "search-label");
  }

  // --- Bind mouse events ---

  nodeSelection
    .on("mouseenter", function (_event, d) {
      if (clickFocusNode) return;
      if (searchHighlightNode) {
        showHoverEffect(this as SVGGElement, d);
        return;
      }
      highlightPath(d);
      showHoverEffect(this as SVGGElement, d);
    })
    .on("mouseleave", function (_event, d) {
      clearHoverEffect(this as SVGGElement, d);
      if (searchHighlightNode) return;
      clearHighlight();
    });

  nodeSelection.style("cursor", "pointer").on("click", (event, d) => {
    event.stopPropagation();
    clickFocusNode = d;
    document.body.setAttribute("data-chart-zoomed", "true");
    highlightSubtree(d);
    zoomToNode(d);
  });

  // Click background to clear click-focus
  svg.on("click", () => {
    if (!clickFocusNode) return;
    clickFocusNode = null;
    document.body.removeAttribute("data-chart-zoomed");
    clearHighlight();
  });

  // --- Reset to default view ---
  const defaultTransform = d3.zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0);

  function resetToDefault() {
    clickFocusNode = null;
    searchHighlightNode = null;
    document.body.removeAttribute("data-chart-zoomed");
    hoverActive = false;

    if (searchLabel) { searchLabel.remove(); searchLabel = null; }
    nodeSelection.each(function (nd) {
      const c = nodeColor(nd);
      d3.select(this).select<SVGElement>("circle, path")
        .attr("fill", lightTint(c, 0.82)).attr("fill-opacity", 1);
    });
    nodeSelection.style("pointer-events", "auto");
    nodeSelection.transition().duration(300).style("opacity", "1");
    linkSelection.transition().duration(300).attr("stroke-opacity", 0.7);

    svg.transition().duration(750).ease(d3.easeCubicInOut)
      .call((zoomBehavior as any).transform, defaultTransform);
    updateSpeciesVisibility(scale0);
  }

  // --- Keyboard: R = reset position; Backspace / Delete = reset when focused ---

  function handleKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      resetToDefault();
      return;
    }

    if (e.key !== "Backspace" && e.key !== "Delete") return;
    if (!clickFocusNode && !searchHighlightNode) return;
    e.preventDefault();
    resetToDefault();
  }
  document.addEventListener("keydown", handleKeyDown, { capture: true });

  // --- Search highlight initialization ---

  if (searchHighlightNode) {
    document.body.setAttribute("data-chart-zoomed", "true");
    if (shouldBloom) {
      const afterBloom = BLOOM_BASE_DELAY * 6 + BLOOM_DURATION * 2;
      setTimeout(() => {
        highlightPath(searchHighlightNode!);
        zoomToPath(searchHighlightNode!);
        addSearchLabel(searchHighlightNode!);
        updateSpeciesVisibility(
          (svg.node() as any).__currentZoomScale ?? scale0
        );
      }, afterBloom);
    } else {
      highlightPath(searchHighlightNode);
      zoomToPath(searchHighlightNode);
      addSearchLabel(searchHighlightNode);
      updateSpeciesVisibility(
        (svg.node() as any).__currentZoomScale ?? scale0
      );
    }
  }

  return {
    cleanup() {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.body.removeAttribute("data-chart-zoomed");
    },
    updateSpeciesVisibility,
  };
}
