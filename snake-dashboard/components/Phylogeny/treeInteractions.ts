import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import type { Snake } from "@/lib/types";
import { BLOOM_BASE_DELAY, BLOOM_DURATION } from "./treeConstants";
import { radialPoint } from "./treeGeometry";
import { nodeRadius, computeNodeFill, getNodeHoverStyle } from "./treeNodeStyles";
import { createUpdateSpeciesVisibility } from "./treeVisibility";

export interface ChartContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  labelsLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodeSelection: d3.Selection<SVGGElement, d3.HierarchyPointNode<HierarchyNode>, SVGGElement, unknown>;
  linkSelection: d3.Selection<SVGPathElement, d3.HierarchyPointLink<HierarchyNode>, SVGGElement, unknown>;
  allNodes: d3.HierarchyPointNode<HierarchyNode>[];
  nodePoints: [number, number][];
  nodeToAncestors: Map<d3.HierarchyNode<HierarchyNode>, Set<d3.HierarchyNode<HierarchyNode>>>;
  nodeColor: (n: d3.HierarchyNode<HierarchyNode>) => string;
  /** Returns current nodeColor (use when colorMode may have changed without effect re-run). */
  getNodeColor?: () => (n: d3.HierarchyNode<HierarchyNode>) => string;
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
  onResetView?: () => void;
  /** Current selected region (getter so clearHighlight always uses latest value, not stale closure). */
  getSelectedRegion: () => Snake["continent"] | null;
  getContinentForSpeciesId: (id: string) => Snake["continent"] | undefined;
}

export function setupInteractions(ctx: ChartContext): {
  cleanup: () => void;
  updateSpeciesVisibility: (scale: number) => void;
  applyRegionFilter: (region: Snake["continent"] | null) => void;
} {
  const {
    svg, g, labelsLayer, nodeSelection, linkSelection, allNodes, nodePoints, nodeToAncestors,
    nodeColor, getNodeColor, isSpecies, currentSnakeId, shouldBloom,
    cw, ch, cx, cy, scale0, zoomScaleRef, zoomBehavior,
    getColorMode, onSpeciesClick, onTaxonomyNodeClick, onResetView,
    getSelectedRegion, getContinentForSpeciesId,
  } = ctx;

  const currentNodeColor = () => (getNodeColor?.() ?? nodeColor);

  let hoverActive = false;
  let hoveredNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let searchHighlightNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let clickFocusNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
  let hoverLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let searchLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let focusLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  /** Set of nodes at full opacity during highlight; used to sync label opacity in labelsLayer. */
  let currentHighlightedNodes = new Set<d3.HierarchyNode<HierarchyNode>>();
  /** When hovering a species at default zoom: family branch stays at 0.2; used for label opacity. */
  let currentFamilyBranchNodes: Set<d3.HierarchyNode<HierarchyNode>> | null = null;
  /** When region filter is active, paths to all species in that region; otherwise null. */
  let regionHighlightPathNodes: Set<d3.HierarchyNode<HierarchyNode>> | null = null;

  // --- Voronoi/Delaunay setup ---
  const delaunay = d3.Delaunay.from(nodePoints);

  if (currentSnakeId) {
    const found = allNodes.find((n) => n.data.id === currentSnakeId);
    searchHighlightNode = found ?? null;
  }

  /** Partial fade (0.2/0.1) for click focus, search highlight, or region when not hovering; when hovering in region view always full dim (0) so only the path is visible. */
  function getDimmedOpacity(): { node: string; link: number } {
    const regionActive = regionHighlightPathNodes != null && regionHighlightPathNodes.size > 0;
    const hoveringInRegion = regionActive && !!hoveredNode;
    const usePartialFade = hoveringInRegion
      ? false
      : !!clickFocusNode ||
        !!searchHighlightNode ||
        regionActive ||
        zoomScaleRef.current > scale0 * 1.001;
    return {
      node: usePartialFade ? "0.2" : "0",
      link: usePartialFade ? 0.1 : 0,
    };
  }

  function getEffectiveHighlightedNodes(): Set<d3.HierarchyNode<HierarchyNode>> {
    if (regionHighlightPathNodes != null && regionHighlightPathNodes.size > 0)
      return regionHighlightPathNodes;
    return currentHighlightedNodes;
  }

  // --- Highlight helpers ---
  function highlightSubtree(target: d3.HierarchyPointNode<HierarchyNode>) {
    hoverActive = true;
    currentFamilyBranchNodes = null;
    const subtreeNodes = new Set<d3.HierarchyNode<HierarchyNode>>();
    target.each((n) => subtreeNodes.add(n));
    currentHighlightedNodes = subtreeNodes;
    const { node: dimmedNode, link: dimmedLink } = getDimmedOpacity();

    nodeSelection
      .transition().duration(250)
      .style("opacity", (d) => (subtreeNodes.has(d) ? "1" : dimmedNode));
    nodeSelection
      .style("pointer-events", (d) => (subtreeNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(250)
      .attr("stroke-opacity", (l) =>
        subtreeNodes.has(l.source) && subtreeNodes.has(l.target) ? 0.9 : dimmedLink
      );
  }

  function highlightPath(target: d3.HierarchyNode<HierarchyNode>) {
    hoverActive = true;
    const ancestors = nodeToAncestors.get(target)!;
    const pathNodes = new Set(ancestors);
    pathNodes.add(target);
    currentHighlightedNodes = pathNodes;
    const { node: dimmedNode, link: dimmedLink } = getDimmedOpacity();

    const regionActive = regionHighlightPathNodes != null && regionHighlightPathNodes.size > 0;
    const isSpeciesAtDefaultZoom =
      isSpecies(target) && dimmedNode === "0" && !regionActive;
    let familyBranch: Set<d3.HierarchyNode<HierarchyNode>> | null = null;
    if (isSpeciesAtDefaultZoom && target.parent?.parent) {
      const family = target.parent.parent;
      familyBranch = new Set<d3.HierarchyNode<HierarchyNode>>();
      family.each((n) => familyBranch!.add(n));
      currentFamilyBranchNodes = familyBranch;
    } else {
      currentFamilyBranchNodes = null;
    }

    nodeSelection
      .transition().duration(200)
      .style("opacity", (d) => {
        if (pathNodes.has(d)) return "1";
        if (familyBranch?.has(d)) return "0.2";
        return dimmedNode;
      });
    nodeSelection
      .style("pointer-events", (d) =>
        pathNodes.has(d) || (familyBranch != null && familyBranch.has(d)) ? "auto" : "none"
      );
    linkSelection.attr("stroke-dashoffset", 0);
    linkSelection
      .transition().duration(200)
      .attr("stroke-opacity", (l) => {
        if (pathNodes.has(l.source) && pathNodes.has(l.target)) return 0.9;
        if (familyBranch && familyBranch.has(l.source) && familyBranch.has(l.target)) return 0.1;
        return dimmedNode === "0" ? 0 : dimmedLink;
      });
  }
  
  function highlightPathToRoot(
    from: d3.HierarchyNode<HierarchyNode>,
    root: d3.HierarchyNode<HierarchyNode>,
  ) {
    hoverActive = true;
    currentFamilyBranchNodes = null;
    const pathNodes = new Set<d3.HierarchyNode<HierarchyNode>>();
    for (let n: d3.HierarchyNode<HierarchyNode> | null = from; n; n = n.parent) {
      pathNodes.add(n);
      if (n === root) break;
    }
    currentHighlightedNodes = pathNodes;
    const { node: dimmedNode, link: dimmedLink } = getDimmedOpacity();

    nodeSelection
      .transition().duration(200)
      .style("opacity", (d) => (pathNodes.has(d) ? "1" : dimmedNode));
    nodeSelection
      .style("pointer-events", (d) => (pathNodes.has(d) ? "auto" : "none"));
    linkSelection
      .transition().duration(200)
      .attr("stroke-opacity", (d) =>
        pathNodes.has(d.source) && pathNodes.has(d.target) ? 0.9 : dimmedLink
      );
  }

  const updateSpeciesVisibility = createUpdateSpeciesVisibility({
    svg, g, labelsLayer, nodeColor, isSpecies, currentSnakeId, zoomScaleRef,
    getClickFocusNode: () => clickFocusNode,
    getSearchHighlightNode: () => searchHighlightNode,
    getHoverActive: () => hoverActive,
    getHoveredNode: () => hoveredNode,
    getHighlightedNodes: () => getEffectiveHighlightedNodes(),
    getFamilyBranchNodes: () => currentFamilyBranchNodes,
    getDimmedOpacity: () => getDimmedOpacity(),
    getRegionFilterActive: () => regionHighlightPathNodes != null && regionHighlightPathNodes.size > 0,
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
    const currentRegion = getSelectedRegion();
    if (currentRegion != null && regionHighlightPathNodes != null && regionHighlightPathNodes.size > 0) {
      highlightPathsForRegion(currentRegion);
      updateSpeciesVisibility(zoomScaleRef.current);
      return;
    }
    hoverActive = false;
    currentHighlightedNodes = new Set();
    currentFamilyBranchNodes = null;
    const currentZoom = zoomScaleRef.current;

    nodeSelection.style("pointer-events", "auto");
    nodeSelection.transition().duration(300).style("opacity", "1");
    linkSelection.attr("stroke-dashoffset", 0);
    linkSelection.transition().duration(300).attr("stroke-opacity", 0.7);
    updateSpeciesVisibility(currentZoom);
  }

  function highlightPathsForRegion(region: Snake["continent"] | null) {
    if (region == null) {
      regionHighlightPathNodes = null;
      if (searchHighlightNode) {
        highlightPath(searchHighlightNode);
      } else if (clickFocusNode) {
        highlightSubtree(clickFocusNode);
      } else {
        hoverActive = false;
        currentHighlightedNodes = new Set();
        currentFamilyBranchNodes = null;
        nodeSelection.style("pointer-events", "auto");
        nodeSelection.transition().duration(200).style("opacity", "1");
        linkSelection.attr("stroke-dashoffset", 0);
        linkSelection.transition().duration(200).attr("stroke-opacity", 0.7);
      }
      updateSpeciesVisibility(zoomScaleRef.current);
      return;
    }
    const pathUnion = new Set<d3.HierarchyNode<HierarchyNode>>();
    for (const n of allNodes) {
      if (!isSpecies(n) || !n.data.id) continue;
      if (getContinentForSpeciesId(n.data.id) !== region) continue;
      const ancestors = nodeToAncestors.get(n);
      if (ancestors) ancestors.forEach((a) => pathUnion.add(a));
      pathUnion.add(n);
    }
    regionHighlightPathNodes = pathUnion;
    currentFamilyBranchNodes = null;
    hoverActive = true;
    const { node: dimmedNode, link: dimmedLink } = getDimmedOpacity();
    nodeSelection
      .transition().duration(200)
      .style("opacity", (d) => (pathUnion.has(d) ? "1" : dimmedNode));
    nodeSelection
      .style("pointer-events", (d) => (pathUnion.has(d) ? "auto" : "none"));
    linkSelection.attr("stroke-dashoffset", 0);
    linkSelection
      .transition().duration(200)
      .attr("stroke-opacity", (l) =>
        pathUnion.has(l.source) && pathUnion.has(l.target) ? 0.9 : dimmedLink
      );
    updateSpeciesVisibility(zoomScaleRef.current);
  }

  // --- Floating label helper ---

  function createLabel(
    parent: d3.Selection<SVGGElement, unknown, null, undefined>,
    node: d3.HierarchyPointNode<HierarchyNode>,
    cls: string,
    opts?: { large?: boolean },
  ) {
    const color = currentNodeColor()(node);
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
      .attr("rx", rx).attr("fill", color).attr("opacity", 1);
    return labelG;
  }

  // --- Hover effects ---
  // Node fill highlight always on hover. Floating hover label only at default zoom (to trace lineage);
  // when zoomed in, ext-labels / in-node text are enough and we avoid duplicates.

  function showHoverEffect(el: SVGGElement, d: d3.HierarchyPointNode<HierarchyNode>) {
    const { fill, fillOpacity } = getNodeHoverStyle(getColorMode(), d, currentNodeColor(), currentSnakeId);
    d3.select(el).select<SVGElement>("circle, path").attr("fill", fill).attr("fill-opacity", fillOpacity);
    if (searchHighlightNode && d === searchHighlightNode) return;
    // Show highlight label only at default zoom; when zoomed in, skip to avoid duplicating ext-labels
    if (zoomScaleRef.current > scale0 * 1.001) return;
    hoverLabel = createLabel(g, d, "hover-label");
  }

  function clearHoverEffect(el: SVGGElement | null, d: d3.HierarchyPointNode<HierarchyNode>) {
    if (!el) return;
    const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
    const fill = computeNodeFill(d, currentNodeColor(), getColorMode(), currentSnakeId);
    d3.select(el).select<SVGElement>("circle, path").attr("fill", fill).attr("fill-opacity", isCurrent ? 0.85 : 1);
    // ext-labels are in labelsLayer and are recreated on each visibility update; no per-node reset needed
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
    regionHighlightPathNodes = null;
    currentHighlightedNodes = new Set();
    currentFamilyBranchNodes = null;
    document.body.removeAttribute("data-chart-zoomed");
    hoverActive = false;

    if (searchLabel) { searchLabel.remove(); searchLabel = null; }
    if (hoverLabel) { hoverLabel.remove(); hoverLabel = null; }
    if (focusLabel) { focusLabel.remove(); focusLabel = null; }

    // Reset all nodes to base state respecting current color mode
    nodeSelection.each(function (nd) {
      const fill = computeNodeFill(nd, currentNodeColor(), getColorMode(), currentSnakeId);
      d3.select(this).select<SVGElement>("circle, path")
        .attr("fill", fill).attr("fill-opacity", 1);
    });
    
    nodeSelection.style("pointer-events", "auto");
    nodeSelection.interrupt().transition().duration(200).style("opacity", "1");
    linkSelection.attr("stroke-dashoffset", 0);
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
      if (!clickFocusNode) return;
      clickFocusNode = null;
      if (focusLabel) { focusLabel.remove(); focusLabel = null; }
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
      if (focusLabel) { focusLabel.remove(); focusLabel = null; }
      document.body.removeAttribute("data-chart-zoomed");
      clearHighlight();
      if (onTaxonomyNodeClick) onTaxonomyNodeClick(null);
      return;
    }

    if (onTaxonomyNodeClick) onTaxonomyNodeClick(d);
    
    clickFocusNode = d;
    // Clear hover label on click so it doesn’t persist after click-to-zoom (families shouldn’t show highlight label)
    if (hoverLabel) { hoverLabel.remove(); hoverLabel = null; }
    highlightSubtree(d);
    updateSpeciesVisibility(zoomScaleRef.current);

    const rank = d.data.rank;
    const canZoomCladeOrInfra =
      (rank === "infraorder" || rank === "clade") &&
      (d.data.name === "Henophidia" || zoomToFitScale(d) >= ZOOM_ABLE_MIN_SCALE);
    const shouldZoom =
      rank === "family" || rank === "genus" || canZoomCladeOrInfra;
    if (shouldZoom) {
      if (focusLabel) { focusLabel.remove(); focusLabel = null; }
      document.body.setAttribute("data-chart-zoomed", "true");
      zoomToNode(d);
    } else {
      document.body.removeAttribute("data-chart-zoomed");
      const isHigherOrder = rank === "clade" || rank === "infraorder" || rank === "suborder";
      if (isHigherOrder && d.data.name !== "Henophidia") {
        if (focusLabel) focusLabel.remove();
        focusLabel = createLabel(g, d, "focus-label", { large: true });
      } else if (focusLabel) {
        focusLabel.remove();
        focusLabel = null;
      }
    }
  });

  // --- Reset to default view ---
  const defaultTransform = d3.zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0);

  function resetToDefault() {
    const nodeToFade = searchHighlightNode ?? (currentSnakeId ? allNodes.find((n) => n.data.id === currentSnakeId) ?? null : null);
    clearAllHighlightsAndState();
    const t = svg.transition().duration(750).ease(d3.easeCubicInOut)
      .call((zoomBehavior as any).transform, defaultTransform);
    t.on("end", () => {
      if (nodeToFade) {
        const targetFill = computeNodeFill(nodeToFade, currentNodeColor(), getColorMode(), undefined);
        nodeSelection.filter((d) => d === nodeToFade)
          .select<SVGElement>("circle, path")
          .transition().duration(480).ease(d3.easeCubicOut)
          .attr("fill", targetFill)
          .on("end", () => onResetView?.());
      } else {
        onResetView?.();
      }
    });
    updateSpeciesVisibility(scale0);
    if (onTaxonomyNodeClick) onTaxonomyNodeClick(null);
  }

  // --- Keyboard: Z = reset position; Backspace/Delete = zoom out (reset) ---
  function handleKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

    if (e.key === "z" || e.key === "Z") {
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
  let searchHighlightTimeoutId: ReturnType<typeof setTimeout> | null = null;
  if (searchHighlightNode) {
    document.body.setAttribute("data-chart-zoomed", "true");
    if (shouldBloom) {
      const maxDepth = Math.max(...allNodes.map(n => n.depth));
      const afterBloom = BLOOM_BASE_DELAY * maxDepth + BLOOM_DURATION;
      searchHighlightTimeoutId = setTimeout(() => {
        searchHighlightTimeoutId = null;
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
      if (searchHighlightTimeoutId != null) {
        clearTimeout(searchHighlightTimeoutId);
        searchHighlightTimeoutId = null;
      }
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      svg.on("pointermove", null).on("pointerleave", null).on("click", null);
      clearAllHighlightsAndState();
    },
    updateSpeciesVisibility,
    applyRegionFilter: (region: Snake["continent"] | null) => highlightPathsForRegion(region),
  };
}
