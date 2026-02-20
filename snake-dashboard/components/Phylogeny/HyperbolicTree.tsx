"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import {
  Props,
  RADIUS,
  BLOOM_BASE_DELAY,
  BLOOM_DURATION,
  familyColor,
  RANK_COLORS,
} from "./treeConstants";
import { radialPoint, starburstPath, hexagonPath, roundedSquarePath, diamondPath } from "./treeGeometry";
import { nodeRadius, fontSize, fontWeight, linkWidth, computeNodeFill } from "./treeNodeStyles";
import { TreeLegend } from "./TreeLegend";
import { setupInteractions } from "./treeInteractions";
import taxonomyDescriptions from "@/data/taxonomy_descriptions.json";
import { TaxonomyInfoBox } from "./TaxonomyInfoBox";
import { getAllSnakes } from "@/lib/snakeData";
import type { Snake } from "@/lib/types";

const venomClassificationColors: Record<Snake['venomClassification'], string> = {
  "Highly Venomous": "#FF7373",
  "Venomous": "#FFAB73",
  "Moderately Venomous": "#FEF08A",
  "Mildly Venomous": "#B9E948",
  "Non-venomous": "#CCCCCC",
};

export function HyperbolicTree({ root: rootData, currentSnakeId }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasBloomedRef = useRef(false);
  const zoomScaleRef = useRef<number>(1);
  const colorModeRef = useRef<'family' | 'venom'>('family');
  const isInitialRenderRef = useRef(true);
  const [selectedTaxon, setSelectedTaxon] = useState<{name: string, description: string} | null>(null);
  const [colorMode, setColorMode] = useState<'family' | 'venom'>('family');
  colorModeRef.current = colorMode;
  
  // Create a lookup map for snake data by id
  const snakeMap = useMemo(() => {
    const snakes = getAllSnakes();
    const map = new Map<string, Snake>();
    snakes.forEach(snake => map.set(snake.id, snake));
    return map;
  }, []);

  const handleTaxonomyNodeClick = (node: d3.HierarchyPointNode<HierarchyNode> | null) => {
    if (!node) {
      setSelectedTaxon(null);
      return;
    }
    const rank = node.data.rank;
    const name = node.data.name.toLowerCase();
    if (rank === 'family' || rank === 'clade' || rank === 'infraorder' || rank === 'suborder') {
      const descriptionData = (taxonomyDescriptions as Record<string, {name: string, description: string}>)[name];
      if (descriptionData) {
        setSelectedTaxon(descriptionData);
      } else {
        setSelectedTaxon(null);
      }
    } else {
      setSelectedTaxon(null);
    }
  };

  const hierarchy = useMemo(() => d3.hierarchy(rootData), [rootData]);

  const isSpecies = (d: d3.HierarchyNode<HierarchyNode>) => d.data.rank === "species";

  const nodeColor = useCallback((n: d3.HierarchyNode<HierarchyNode>): string => {
    if (colorMode === 'venom' && isSpecies(n) && n.data.id) {
      const snake = snakeMap.get(n.data.id);
      if (snake?.venomClassification) {
        return venomClassificationColors[snake.venomClassification] ?? "#94a3b8";
      }
    }
    const rank = n.data.rank;
    if (rank && RANK_COLORS[rank]) return RANK_COLORS[rank];
    
    function familyOf(n: d3.HierarchyNode<HierarchyNode>): string | null {
      for (let c: typeof n | null = n; c; c = c.parent)
        if (c.data.rank === "family") return c.data.name;
      return null;
    }
    const f = familyOf(n);
    return f ? familyColor(f) : "#94a3b8";
  }, [colorMode, snakeMap]);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!svgEl || !container) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.style("font", "11px Inter, system-ui, sans-serif");

    const shouldBloom = !hasBloomedRef.current && !currentSnakeId;

    // --- Layout (D3 cluster radial) ---
    // Fragility: layout assumes root has exactly two depth-1 children (Scolecophidia, Alethinophidia),
    // and depth-2 under Alethinophidia = Henophidia/Caenophidia. New snakes only add leaves; new
    // families need FAMILY_TO_CLADE in snakeTaxonomy. Names must match (Scolecophidia, Alethinophidia, Henophidia).
    // Sort so Scolecophidia is first, then Alethinophidia; stable order elsewhere
    const hierarchyCopy = hierarchy.copy();
    hierarchyCopy.sort((a, b) => {
      if (a.depth === 1) {
        if (a.data.name === "Scolecophidia") return -1;
        if (b.data.name === "Scolecophidia") return 1;
      }
      return (a.data.name || "").localeCompare(b.data.name || "");
    });

    const clusterLayout = d3
      .cluster<HierarchyNode>()
      .size([2 * Math.PI, RADIUS])
      .separation((a, b) => {
        const depth = Math.max(1, a.depth ?? 1);
        const base = a.parent === b.parent ? 2.6 : 3.5;
        const infraA = a.ancestors().find((n) => n.depth === 1);
        const infraB = b.ancestors().find((n) => n.depth === 1);
        const inDifferentBranches = infraA && infraB && infraA !== infraB;
        const familyA = a.ancestors().find((n) => (n.data as HierarchyNode).rank === "family");
        const familyB = b.ancestors().find((n) => (n.data as HierarchyNode).rank === "family");
        const inDifferentFamilies = familyA && familyB && familyA !== familyB;
        // Extra gap between Pythonidae and Boidae under Henophidia so they don't look closer than Viper/Elapids
        const clade2A = a.ancestors().find((n) => n.depth === 2);
        const clade2B = b.ancestors().find((n) => n.depth === 2);
        const underHenophidia = (n: d3.HierarchyNode<HierarchyNode>) => (n.data as HierarchyNode).name === "Henophidia";
        const pythonVsBoa =
          clade2A && clade2B && underHenophidia(clade2A) && underHenophidia(clade2B) &&
          familyA && familyB && familyA !== familyB &&
          ((familyA.data as HierarchyNode).name === "Pythonidae" && (familyB.data as HierarchyNode).name === "Boidae" ||
           (familyA.data as HierarchyNode).name === "Boidae" && (familyB.data as HierarchyNode).name === "Pythonidae");
        const raw = base + (inDifferentBranches ? 3 : 0) + (inDifferentFamilies ? 1.5 : 0) + (pythonVsBoa ? 2.2 : 0);
        // Softer depth falloff so branches stay more open at deeper levels (flower effect)
        const depthFactor = Math.pow(depth, 0.82);
        return raw / depthFactor;
      });

    const root = clusterLayout(hierarchyCopy);

    // Pin infraorders: Scolecophidia in a small top sector; Alethinophidia gets the rest of the circle so the bottom is clearly separated (no cluster)
    const infraorders = root.children;
    const TOP_SECTOR_RAD = 1.85; // sector at top for Scolecophidia — wider to open the flower
    const GAP = 1.2; // circumferential gap so Alethinophidia (Atractaspididae) stays clear of top sector (Typhlopidae)
    const BOTTOM_ANGLE_START = GAP;
    const BOTTOM_ANGLE_END = 2 * Math.PI - GAP; // Alethinophidia spans most of the circle
    if (infraorders && infraorders.length === 2) {
      const scolecophidia = infraorders.find((c) => c.data.name === "Scolecophidia");
      const alethinophidia = infraorders.find((c) => c.data.name === "Alethinophidia");
      const centerTop = 0;
      const centerBottom = Math.PI;

      function confineSubtreeToSector(
        node: d3.HierarchyNode<HierarchyNode>,
        center: number,
        sectorRad: number,
      ) {
        const descendants = node.descendants();
        if (descendants.length === 0) return;
        const xs = descendants.map((n) => (n as any).x);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const span = xMax - xMin || 1;
        descendants.forEach((n) => {
          const x = (n as any).x;
          (n as any).x = center + ((x - xMin) / span) * sectorRad - sectorRad / 2;
        });
      }

      function confineSubtreeToArc(
        node: d3.HierarchyNode<HierarchyNode>,
        angleStart: number,
        angleEnd: number,
      ) {
        const descendants = node.descendants();
        if (descendants.length === 0) return;
        const xs = descendants.map((n) => (n as any).x);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const span = xMax - xMin || 1;
        const arcSpan = angleEnd - angleStart;
        descendants.forEach((n) => {
          const x = (n as any).x;
          (n as any).x = angleStart + ((x - xMin) / span) * arcSpan;
        });
      }

      if (scolecophidia) {
        (scolecophidia as any).x = centerTop;
        (scolecophidia as any).y = RADIUS * 0.25;
        confineSubtreeToSector(scolecophidia, centerTop, TOP_SECTOR_RAD);
      }
      if (alethinophidia) {
        (alethinophidia as any).x = centerBottom;
        (alethinophidia as any).y *= 1.4;
        confineSubtreeToArc(alethinophidia, BOTTOM_ANGLE_START, BOTTOM_ANGLE_END);
        // Shift Henophidia along the circumference away from Caenophidia (Viper) so it reads as a distinct flower
        const henophidia = alethinophidia.children?.find((c) => (c.data as HierarchyNode).name === "Henophidia");
        const HENOPHIDIA_ANGULAR_OFFSET = 0.1; // radians; positive = away from Viper side
        if (henophidia) {
          henophidia.descendants().forEach((n) => {
            (n as any).x += HENOPHIDIA_ANGULAR_OFFSET;
          });
        }
      }
    }


    const allNodes = root.descendants();
    const allLinks = root.links();
    const nodePoints = allNodes.map(n => radialPoint((n as any).x, (n as any).y));

    // --- Ancestor lookup for path highlighting ---
    const nodeToAncestors = new Map<
      d3.HierarchyNode<HierarchyNode>,
      Set<d3.HierarchyNode<HierarchyNode>>
    >();
    allNodes.forEach((n) => {
      const ancestors = new Set<d3.HierarchyNode<HierarchyNode>>();
      for (let cur: d3.HierarchyNode<HierarchyNode> | null = n; cur; cur = cur.parent)
        ancestors.add(cur);
      nodeToAncestors.set(n, ancestors);
    });

    // --- SVG defs: gradient per link (node centers) ---
    const defs = svg.append("defs");
    allLinks.forEach((link, i) => {
      const sourcePos = radialPoint((link.source as any).x, (link.source as any).y);
      const targetPos = radialPoint((link.target as any).x, (link.target as any).y);
      const grad = defs
        .append("linearGradient")
        .datum(link) // Bind link data to gradient for later updates
        .attr("id", `link-grad-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", sourcePos[0]).attr("y1", sourcePos[1])
        .attr("x2", targetPos[0]).attr("y2", targetPos[1]);
      grad.append("stop").attr("offset", "0%").attr("stop-color", nodeColor(link.source)).attr("stop-opacity", 0.8);
      grad.append("stop").attr("offset", "100%").attr("stop-color", nodeColor(link.target)).attr("stop-opacity", 0.8);
    });

    const g = svg.append("g");

    // --- Links: node centers; magnetic repulsion except for links within a family (family + its child branches) ---
    const linkGen = d3
      .linkRadial<d3.HierarchyLink<HierarchyNode>, d3.HierarchyPointNode<HierarchyNode>>()
      .angle((d) => (d as any).x)
      .radius((d) => (d as any).y);

    const REPEL_SAMPLES = 24;
    const REPEL_MARGIN = 12;

    function linkPath(link: d3.HierarchyPointLink<HierarchyNode>): string {
      const src = link.source as d3.HierarchyPointNode<HierarchyNode>;
      const tgt = link.target as d3.HierarchyPointNode<HierarchyNode>;
      const familyOf = (n: d3.HierarchyNode<HierarchyNode>) =>
        n.ancestors().find((a) => (a.data as HierarchyNode).rank === "family");
      const familySrc = familyOf(src);
      const familyTgt = familyOf(tgt);
      const sameFamily = familySrc && familyTgt && familySrc === familyTgt;
      if (sameFamily) return linkGen(link) ?? "";

      const obstacles = allNodes.filter((n) => n !== src && n !== tgt);
      if (obstacles.length === 0) return linkGen(link) ?? "";

      const points: [number, number][] = [];
      for (let i = 0; i <= REPEL_SAMPLES; i++) {
        const t = i / REPEL_SAMPLES;
        const angle = src.x + t * (tgt.x - src.x);
        const r = src.y + t * (tgt.y - src.y);
        points.push(radialPoint(angle, r));
      }

      const displaced = points.map((p) => [p[0], p[1]] as [number, number]);
      for (let i = 1; i < displaced.length; i++) {
        const p = displaced[i];
        for (const node of obstacles) {
          const o = radialPoint((node as any).x, (node as any).y);
          const dx = p[0] - o[0];
          const dy = p[1] - o[1];
          const dist = Math.hypot(dx, dy);
          const minDist = nodeRadius(node) + REPEL_MARGIN;
          if (dist < minDist && dist > 1e-6) {
            const scale = minDist / dist;
            p[0] = o[0] + dx * scale;
            p[1] = o[1] + dy * scale;
          }
        }
      }

      const line = d3.line<[number, number]>().curve(d3.curveCatmullRom.alpha(0.5));
      return line(displaced) ?? "";
    }

    const linkSelection = g.append("g").attr("fill", "none")
      .selectAll<SVGPathElement, d3.HierarchyPointLink<HierarchyNode>>("path")
      .data(allLinks).join("path")
      .attr("class", (d) => isSpecies(d.target) ? "link species-link" : "link")
      .attr("d", linkPath)
      .attr("stroke", (_d, i) => `url(#link-grad-${i})`)
      .attr("stroke-width", (d) => linkWidth(d.source.depth))
      .attr("stroke-linecap", "round")
      .attr("stroke-opacity", shouldBloom ? 0 : 0.7);

    if (shouldBloom) {
      linkSelection.transition()
        .delay((d) => BLOOM_BASE_DELAY * d.source.depth)
        .duration(BLOOM_DURATION).ease(d3.easeCubicOut)
        .attr("stroke-opacity", 0.7);
    }

    // --- Nodes ---
    const nodeSelection = g.append("g")
      .selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>("g")
      .data(allNodes).join("g")
      .attr("class", (d) => isSpecies(d) ? "node species-node" : "node")
      .attr("transform", (d) => {
        const [x, y] = radialPoint((d as any).x, (d as any).y);
        return `translate(${x},${y})`;
      });

    // Node shapes
    nodeSelection.each(function (d) {
      const el = d3.select(this);
      const r = nodeRadius(d);
      const color = nodeColor(d);
      const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
      const fill = computeNodeFill(d, nodeColor, colorMode, currentSnakeId);
      const rank = d.data.rank;
      const sw = Math.max(2, r * 0.06);

      let shape: d3.Selection<SVGElement, unknown, null, undefined>;

      if (rank === "suborder") {
        shape = el.append("path").attr("d", starburstPath(r, 18, 0.12)).attr("fill", fill)
          .attr("stroke", color).attr("stroke-width", 5).attr("stroke-linejoin", "round") as any;
      } else if (rank === "family") {
        const angleDeg = ((d as any).x * 180) / Math.PI - 90;
        shape = el.append("path").attr("d", hexagonPath(r)).attr("fill", fill)
          .attr("stroke", color).attr("stroke-width", Math.max(3, sw)).attr("stroke-linejoin", "round")
          .attr("transform", `rotate(${angleDeg})`) as any;
      } else if (rank === "genus") {
        const angleDeg = ((d as any).x * 180) / Math.PI - 90;
        shape = el.append("path").attr("d", diamondPath(r)).attr("fill", fill)
          .attr("stroke", color).attr("stroke-width", Math.max(2, sw)).attr("stroke-linejoin", "miter")
          .attr("transform", `rotate(${angleDeg})`) as any;
      } else if (rank === "infraorder") {
        shape = el.append("path").attr("d", roundedSquarePath(r)).attr("fill", fill)
          .attr("stroke", color).attr("stroke-width", Math.max(3, sw)).attr("stroke-linejoin", "round") as any;
      } else {
        shape = el.append("circle").attr("r", r).attr("fill", fill)
          .attr("stroke", color).attr("stroke-width", isCurrent ? 4 : Math.max(2, sw)) as any;
      }

      if (shouldBloom) {
        shape.attr("transform", "scale(0)")
          .transition().delay(BLOOM_BASE_DELAY * d.depth).duration(BLOOM_DURATION)
          .ease(d3.easeBackOut.overshoot(0.8)).attr("transform", "scale(1)");
      }
    });

    // Labels — only for higher ranks (genus/species labels are unreadable in-node)
    nodeSelection
      .filter((d) => d.data.rank !== "genus" && d.data.rank !== "species")
      .append("text")
      .attr("x", 0).attr("dy", "0.35em").attr("text-anchor", "middle")
      .attr("font-size", (d) => `${fontSize(d)}px`)
      .attr("font-weight", (d) => fontWeight(d))
      .attr("fill", (d) => nodeColor(d))
      .attr("opacity", shouldBloom ? 0 : 1)
      .text((d) => {
        if (d.data.rank === "infraorder" && (!d.children || d.children.length === 0))
          return `${d.data.name} (blind snakes)`;
        return d.data.name;
      });

    if (shouldBloom) {
      nodeSelection.selectAll("text")
        .transition()
        .delay((_d: unknown, i: number) => BLOOM_BASE_DELAY * allNodes[i].depth + BLOOM_DURATION * 0.5)
        .duration(BLOOM_DURATION * 0.6).ease(d3.easeCubicOut)
        .attr("opacity", 1);
    }

    // Tooltips
    nodeSelection.append("title")
      .text((d) => d.ancestors().map((a) => a.data.name).reverse().join(" → "));

    // Labels layer (after nodes so labels render on top and are never covered by dimmed node circles)
    const labelsLayer = g.append("g").attr("class", "labels-layer");

    g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(".species-link")
      .style("transition", "stroke-opacity 0.2s ease");

    // --- Bounding box for initial view ---
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    allNodes.forEach((n) => {
      const [px, py] = radialPoint((n as any).x, (n as any).y);
      const r = nodeRadius(n);
      x0 = Math.min(x0, px - r); y0 = Math.min(y0, py - r);
      x1 = Math.max(x1, px + r); y1 = Math.max(y1, py + r);
    });
    const pad = 150;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;

    const cw = Math.max(container.clientWidth, 400);
    const ch = Math.max(container.clientHeight, 300);
    const extent = Math.max(x1 - x0, y1 - y0, 1); // avoid div by zero / NaN if no nodes
    const scale0 = Math.min(cw / extent, ch / extent, 1.2);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    // --- Zoom ---
    let updateSpeciesVisibility: (k: number) => void = () => {};
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        updateSpeciesVisibility(event.transform.k);
      });

    svg.attr("viewBox", `0 0 ${cw} ${ch}`)
      .call(zoomBehavior as any)
      .call(
        (zoomBehavior as any).transform,
        d3.zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0)
      );

    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
      svg.transition().duration(750).ease(d3.easeCubicInOut)
        .call(
          (zoomBehavior as any).transform,
          d3.zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0)
        );
    });

    // --- Interactions ---
    const interactions = setupInteractions({
      svg, g, labelsLayer, nodeSelection, linkSelection, nodeToAncestors,
      allNodes, nodePoints,
      nodeColor, isSpecies, currentSnakeId, shouldBloom,
      cw, ch, cx, cy, scale0, zoomScaleRef, zoomBehavior,
      getColorMode: () => colorModeRef.current,
      onSpeciesClick: (id) => router.push(`/snakes/${id}`),
      onTaxonomyNodeClick: handleTaxonomyNodeClick,
      onResetView: () => router.replace("/phylogeny"),
    });
    updateSpeciesVisibility = interactions.updateSpeciesVisibility;
    interactions.updateSpeciesVisibility(scale0);

    const maxDepth = Math.max(...allNodes.map(n => n.depth));
    const bloomDelay = shouldBloom ? BLOOM_BASE_DELAY * maxDepth + BLOOM_DURATION : 0;
    const bloomTimer = setTimeout(() => { hasBloomedRef.current = true; }, bloomDelay);

    return () => {
      clearTimeout(bloomTimer);
      // Remove zoom/dblclick so they don’t accumulate on rebuild (effect re-run)
      svg.on(".zoom", null).on("dblclick", null);
      interactions.cleanup();
    };
  }, [hierarchy, currentSnakeId, router]);

  // Effect to update colors when colorMode changes (skip initial mount to avoid killing bloom)
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    const svg = d3.select(svgRef.current);
    if (!svg.node() || !svg.selectAll(".node").size()) return;

    // Update node fills — interrupt any in-flight color transitions first
    svg.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(".node")
      .each(function(d) {
        const shape = d3.select(this).select<SVGElement>("circle, path");
        shape.interrupt("color");
        const newColor = nodeColor(d);
        const fill = computeNodeFill(d, nodeColor, colorMode, currentSnakeId);
        shape.transition("color").duration(500)
          .attr("fill", fill)
          .attr("stroke", newColor);
      });

    // Update link gradients — interrupt before transitioning
    const defs = svg.select("defs");
    if (defs.node()) {
      defs.selectAll<SVGLinearGradientElement, d3.HierarchyPointLink<HierarchyNode>>("linearGradient")
        .each(function(d) {
          if (!d || !d.source || !d.target) return;
          const link = d;
          d3.select(this).selectAll("stop")
            .interrupt("color")
            .transition("color").duration(500)
            .attr("stop-color", (_stopD, i) => nodeColor(i === 0 ? link.source : link.target));
        });
    }

  }, [colorMode, nodeColor, currentSnakeId]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full h-full min-h-0 overflow-hidden bg-stone-50/50 outline-none"
      onMouseDown={() => containerRef.current?.focus()}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "grab" }}
      />
      {selectedTaxon && (
        <TaxonomyInfoBox
          name={selectedTaxon.name}
          description={selectedTaxon.description}
          onClose={() => setSelectedTaxon(null)}
        />
      )}
      <button
        onClick={() => setColorMode((m) => (m === 'venom' ? 'family' : 'venom'))}
        className={`absolute top-2 right-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          colorMode === 'venom'
            ? 'bg-stone-800 text-white shadow-sm'
            : 'bg-white/80 text-stone-600 hover:text-stone-800 border border-stone-200/50 backdrop-blur-sm'
        }`}
      >
        Venom
      </button>
      <p className="absolute bottom-2 left-2 text-xs text-stone-400 pointer-events-none">
        Drag to pan · Scroll to zoom · Click node to focus · R to reset view ·
        Hover to trace lineage
      </p>
      <TreeLegend />
    </div>
  );
}
