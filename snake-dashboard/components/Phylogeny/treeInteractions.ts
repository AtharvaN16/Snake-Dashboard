import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import { BLOOM_BASE_DELAY, BLOOM_DURATION } from "./treeConstants";
import { radialPoint } from "./treeGeometry";
import { nodeRadius, computeNodeFill } from "./treeNodeStyles";
import { createUpdateSpeciesVisibility } from "./treeVisibility";

export interface ChartContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodeSelection: d3.Selection<SVGGElement, d3.HierarchyPointNode<HierarchyNode>, SVGGElement, unknown>;
  linkSelection: d3.Selection<SVGPathElement, d3.HierarchyPointLink<HierarchyNode>, SVGGElement, unknown>;
  allNodes: d3.HierarchyPointNode<HierarchyNode>[];
  nodePoints: [number, number][];
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
  zoomScaleRef: { current: number };
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
  getColorMode: () => "family" | "venom";
  onSpeciesClick?: (snakeId: string) => void;
  onTaxonomyNodeClick?: (node: d3.HierarchyPointNode<HierarchyNode> | null) => void;
}

export function setupInteractions(ctx: ChartContext): { cleanup: () => void; updateSpeciesVisibility: (scale: number) => void } {
  const {
    svg, g, nodeSelection, linkSelection, allNodes, nodePoints, nodeToAncestors,
    nodeColor, isSpecies, currentSnakeId, shouldBloom,
    cw, ch, cx, cy, scale0, zoomScaleRef, zoomBehavior,
    getColorMode, onSpeciesClick, onTaxonomyNodeClick,
  } = ctx;

  let hoverActive = false;
  let hoveredNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let searchHighlightNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let clickFocusNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let hoverLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let searchLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

  // --- Voronoi/Delaunay setup ---
  const delaunay = d3.Delaunay.from(nodePoints);

  if (currentSnakeId) {
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
      .style("opacity", (d) => (subtreeNodes.has(d) ? "1" : "0.2"));
    nodeSelection
      .style("pointer-events", (d) => (subtreeNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(250)
      .attr("stroke-opacity", (l) =>
        subtreeNodes.has(l.source) && subtreeNodes.has(l.target) ? 0.9 : 0.1
      );
  }

  function highlightPath(target: d3.HierarchyNode<HierarchyNode>) {
    hoverActive = true;
    const ancestors = nodeToAncestors.get(target)!;
    const pathNodes = new Set(ancestors);
    pathNodes.add(target);

    nodeSelection
      .transition().duration(200)
      .style("opacity", (d) => (pathNodes.has(d) ? "1" : "0.2"));
    nodeSelection
      .style("pointer-events", (d) => (pathNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(200)
      .attr("stroke-opacity", (d) =>
        pathNodes.has(d.source) && pathNodes.has(d.target) ? 0.9 : 0.1
      );
  }
  
  function highlightPathToRoot(
    from: d3.HierarchyNode<HierarchyNode>,
    root: d3.HierarchyNode<HierarchyNode>,
  ) {
    hoverActive = true;
    const pathNodes = new Set<d3.HierarchyNode<HierarchyNode>>();
    for (let n: d3.HierarchyNode<HierarchyNode> | null = from; n; n = n.parent) {
      pathNodes.add(n);
      if (n === root) break;
    }

    nodeSelection
      .transition().duration(200)
      .style("opacity", (d) => (pathNodes.has(d) ? "1" : "0.2"));
    nodeSelection
      .style("pointer-events", (d) => (pathNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(200)
      .attr("stroke-opacity", (d) =>
        pathNodes.has(d.source) && pathNodes.has(d.target) ? 0.9 : 0.1
      );
  }

  const updateSpeciesVisibility = createUpdateSpeciesVisibility({
    svg, g, nodeColor, isSpecies, currentSnakeId, zoomScaleRef,
    getClickFocusNode: () => clickFocusNode,
    getSearchHighlightNode: () => searchHighlightNode,
    getHoverActive: () => hoverActive,
    getHoveredNode: () => hoveredNode,
  });

  function clearHighlight() {
    if (clickFocusNode) {
      highlightSubtree(clickFocusNode);
      updateSpeciesVisibility(zoomScaleRef.current);
      return;
    }
    if (searchHighlightNode) {
      highlightPath(searchHighlightNode);
      updateSpeciesVisibility(zoomScaleRef.current);
      return;
    }
    hoverActive = false;
    const currentZoom = zoomScaleRef.current;

    nodeSelection.style("pointer-events", "auto");
    nodeSelection.transition().duration(300).style("opacity", "1");
    linkSelection.transition().duration(300).attr("stroke-opacity", 0.7);
    updateSpeciesVisibility(currentZoom);
  }

  // --- Floating label helper ---

  function createLabel(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: d3.HierarchyPointNode<HierarchyNode>,
    cls: string,
    opts?: { large?: boolean },
  ) {
    const color = nodeColor(node);
    const r = nodeRadius(node);
    const [px, py] = radialPoint((node as any).x, (node as any).y);
    const k = zoomScaleRef.current;
    const invK = 1 / k;
    const gap = r + (opts?.large ? 28 : 24) * invK;
    const labelG = parent.append("g").attr("class", cls).attr("transform", `translate(${px},${py - gap})`);
    const baseFs = opts?.large ? 15 : 14;
    const fs = baseFs * invK, padX = 8 * invK, padY = 5 * invK, rx = 6 * invK;
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
    if (searchHighlightNode && d === searchHighlightNode) return;
    if (clickFocusNode && d === clickFocusNode) return;
    hoverLabel = createLabel(g, d, "hover-label");
  }

  function clearHoverEffect(el: SVGGElement | null, d: d3.HierarchyPointNode<HierarchyNode>) {
    if (!el) return;
    const color = nodeColor(d);
    const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
    const fill = computeNodeFill(d, nodeColor, getColorMode(), currentSnakeId);
    d3.select(el).select<SVGElement>("circle, path").attr("fill", fill).attr("fill-opacity", isCurrent ? 0.85 : 1);
    const extLabel = d3.select(el).select(".ext-label");
    if (!extLabel.empty()) {
      extLabel.select("rect").attr("fill", "#fff").attr("fill-opacity", 0.85);
      extLabel.select("text").attr("fill", color).attr("font-weight", "500");
    }
    if (hoverLabel) { hoverLabel.remove(); hoverLabel = null; }
  }

  // --- Zoom helpers ---

  const ZOOM_PADDING = 100;
  const ZOOM_MAX_SCALE = 4;
  const ZOOM_ABLE_MIN_SCALE = 1.0;

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

  function zoomToFitScale(target: d3.HierarchyPointNode<HierarchyNode>): number {
    const nodes: d3.HierarchyNode<HierarchyNode>[] = [];
    target.each((n) => nodes.push(n));
    let tx0 = Infinity, ty0 = Infinity, tx1 = -Infinity, ty1 = -Infinity;
    for (const n of nodes) {
      const [px, py] = radialPoint((n as any).x, (n as any).y);
      const r = nodeRadius(n);
      tx0 = Math.min(tx0, px - r); ty0 = Math.min(ty0, py - r);
      tx1 = Math.max(tx1, px + r); ty1 = Math.max(ty1, py + r);
    }
    tx0 -= ZOOM_PADDING; ty0 -= ZOOM_PADDING; tx1 += ZOOM_PADDING; ty1 += ZOOM_PADDING;
    return Math.min(cw / (tx1 - tx0), ch / (ty1 - ty0), ZOOM_MAX_SCALE);
  }

  function zoomToNode(target: d3.HierarchyPointNode<HierarchyNode>) {
    const nodes: d3.HierarchyNode<HierarchyNode>[] = [];
    target.each((n) => nodes.push(n));
    zoomToBounds(nodes, ZOOM_PADDING, ZOOM_MAX_SCALE);
  }

  function zoomToPath(target: d3.HierarchyPointNode<HierarchyNode>) {
    const ancestors = nodeToAncestors.get(target)!;
    const pathNodes = new Set(ancestors);
    pathNodes.add(target);
    zoomToBounds(pathNodes, 500, 0.8);
  }

  function addSearchLabel(node: d3.HierarchyPointNode<HierarchyNode>) {
    if (searchLabel) searchLabel.remove();
    searchLabel = createLabel(g, node, "search-label", { large: true });
  }

  function clearAllHighlightsAndState() {
    clickFocusNode = null;
    searchHighlightNode = null;
    hoveredNode = null;
    document.body.removeAttribute("data-chart-zoomed");
    hoverActive = false;

    if (searchLabel) { searchLabel.remove(); searchLabel = null; }
    if (hoverLabel) { hoverLabel.remove(); hoverLabel = null; }

    // Reset all nodes to base state respecting current color mode
    nodeSelection.each(function (nd) {
      const fill = computeNodeFill(nd, nodeColor, getColorMode(), currentSnakeId);
      d3.select(this).select<SVGElement>("circle, path")
        .attr("fill", fill).attr("fill-opacity", 1);
    });
    
    nodeSelection.style("pointer-events", "auto");
    nodeSelection.interrupt().transition().duration(200).style("opacity", "1");
    linkSelection.interrupt().transition().duration(200).attr("stroke-opacity", 0.7);
  }

  // --- Bind mouse events ---
  // Store a map from node object to its DOM element
  const nodeElementMap = new Map<d3.HierarchyPointNode<HierarchyNode>, SVGGElement>();
  nodeSelection.each(function(d) {
    nodeElementMap.set(d, this);
  });

  svg.on("pointermove", (event) => {
    const [mx, my] = d3.pointer(event, g.node());
    const closestNodeIndex = delaunay.find(mx, my);
    const newNode = allNodes[closestNodeIndex];
    
    // Calculate distance to the new node
    const closestPoint = nodePoints[closestNodeIndex];
    const dist = Math.sqrt(Math.pow(mx - closestPoint[0], 2) + Math.pow(my - closestPoint[1], 2));
    const radius = nodeRadius(newNode);
    const threshold = radius + 30; // Hover if within 30px of the node's edge

    let finalNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
    if (dist <= threshold) {
      finalNode = newNode;
    }

    if (finalNode !== hoveredNode) {
      // Clear old hover
      if (hoveredNode) {
        const oldEl = nodeElementMap.get(hoveredNode);
        if (oldEl) clearHoverEffect(oldEl, hoveredNode);
      }

      // Set new hover state
      hoveredNode = finalNode;

      if (!hoveredNode) {
        clearHighlight();
        return;
      }

      const el = nodeElementMap.get(hoveredNode);
      if (!el) return;

      if (clickFocusNode) {
        highlightPathToRoot(hoveredNode, clickFocusNode);
      } else if (searchHighlightNode) {
        highlightPath(hoveredNode);
      } else {
        highlightPath(hoveredNode);
      }
      updateSpeciesVisibility(zoomScaleRef.current);
      showHoverEffect(el, hoveredNode);
    }
  }).on("pointerleave", () => {
    if (hoveredNode) {
      const el = nodeElementMap.get(hoveredNode);
      if (el) clearHoverEffect(el, hoveredNode);
      hoveredNode = null;
      clearHighlight();
    }
  });

  svg.style("cursor", "pointer").on("click", (event) => {
    if (!hoveredNode) {
      // Clicked on background, clear focus
      if (!clickFocusNode) return;
      clickFocusNode = null;
      document.body.removeAttribute("data-chart-zoomed");
      if (onTaxonomyNodeClick) onTaxonomyNodeClick(null);
      clearHighlight();
      return;
    }
    
    event.stopPropagation();
    const d = hoveredNode;
    
    if (isSpecies(d) && d.data.id && onSpeciesClick) {
      if (onTaxonomyNodeClick) onTaxonomyNodeClick(null);
      onSpeciesClick(d.data.id);
      return;
    }

    if (clickFocusNode === d) {
      clickFocusNode = null;
      document.body.removeAttribute("data-chart-zoomed");
      clearHighlight();
      if (onTaxonomyNodeClick) onTaxonomyNodeClick(null);
      return;
    }

    if (onTaxonomyNodeClick) onTaxonomyNodeClick(d);
    
    clickFocusNode = d;
    highlightSubtree(d);
    updateSpeciesVisibility(zoomScaleRef.current);

    const rank = d.data.rank;
    const canZoomCladeOrInfra =
      (rank === "infraorder" || rank === "clade") &&
      (d.data.name === "Henophidia" || zoomToFitScale(d) >= ZOOM_ABLE_MIN_SCALE);
    const shouldZoom =
      rank === "family" || rank === "genus" || canZoomCladeOrInfra;
    if (shouldZoom) {
      document.body.setAttribute("data-chart-zoomed", "true");
      zoomToNode(d);
    } else {
      document.body.removeAttribute("data-chart-zoomed");
    }
  });

  // --- Reset to default view ---
  const defaultTransform = d3.zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0);

  function resetToDefault() {
    clearAllHighlightsAndState();
    svg.transition().duration(750).ease(d3.easeCubicInOut)
      .call((zoomBehavior as any).transform, defaultTransform);
    updateSpeciesVisibility(scale0);
    if (onTaxonomyNodeClick) onTaxonomyNodeClick(null);
  }

  // --- Keyboard: R = reset position; Backspace/Delete = zoom out (reset) ---
  function handleKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      resetToDefault();
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      resetToDefault();
    }
  }
  document.addEventListener("keydown", handleKeyDown, { capture: true });

  // --- Search highlight initialization ---
  if (searchHighlightNode) {
    document.body.setAttribute("data-chart-zoomed", "true");
    if (shouldBloom) {
      const maxDepth = Math.max(...allNodes.map(n => n.depth));
      const afterBloom = BLOOM_BASE_DELAY * maxDepth + BLOOM_DURATION;
      setTimeout(() => {
        highlightPath(searchHighlightNode!);
        zoomToPath(searchHighlightNode!);
        addSearchLabel(searchHighlightNode!);
        updateSpeciesVisibility(zoomScaleRef.current);
      }, afterBloom);
    } else {
      highlightPath(searchHighlightNode);
      zoomToPath(searchHighlightNode);
      addSearchLabel(searchHighlightNode);
      updateSpeciesVisibility(zoomScaleRef.current);
    }
  }

  return {
    cleanup() {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearAllHighlightsAndState();
    },
    updateSpeciesVisibility,
  };
}
