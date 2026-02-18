"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import {
  Props,
  RADIUS,
  BLOOM_BASE_DELAY,
  BLOOM_DURATION,
  FAMILY_PALETTE,
  RANK_COLORS,
} from "./treeConstants";
import { radialPoint, starburstPath, hexagonPath, roundedSquarePath, diamondPath, lightTint } from "./treeGeometry";
import { nodeRadius, fontSize, fontWeight, linkWidth } from "./treeNodeStyles";
import { TreeLegend } from "./TreeLegend";
import { setupInteractions } from "./treeInteractions";
import taxonomyDescriptions from "@/data/taxonomy_descriptions.json";
import { TaxonomyInfoBox } from "./TaxonomyInfoBox";

export function HyperbolicTree({ root: rootData, currentSnakeId }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasBloomedRef = useRef(false);
  const [selectedTaxon, setSelectedTaxon] = useState<{name: string, description: string} | null>(null);

  const handleTaxonomyNodeClick = (node: d3.HierarchyPointNode<HierarchyNode>) => {
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

  const { hierarchy, colorScale } = useMemo(() => {
    const h = d3.hierarchy(rootData);
    const families = new Set<string>();
    h.each((n) => {
      if (n.data.rank === "family") families.add(n.data.name);
    });
    const cs = d3
      .scaleOrdinal<string>()
      .domain([...families].sort())
      .range(FAMILY_PALETTE);
    return { hierarchy: h, colorScale: cs };
  }, [rootData]);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!svgEl || !container) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.style("font", "11px Inter, system-ui, sans-serif");

    const shouldBloom = !hasBloomedRef.current && !currentSnakeId;

    // --- Layout ---
    const clusterLayout = d3
      .cluster<HierarchyNode>()
      .size([2 * Math.PI, RADIUS])
      .separation((a, b) => {
        const depth = Math.max(1, a.depth ?? 1);
        return (a.parent === b.parent ? 2 : 3) / depth;
      });

    const root = clusterLayout(hierarchy.copy());

    const infraorders = root.children;
    if (infraorders && infraorders.length === 2) {
      (infraorders[0] as any).x = -Math.PI / 2;
      (infraorders[0] as any).y = RADIUS * 0.25;
      (infraorders[1] as any).x = Math.PI / 2;
      (infraorders[1] as any).y *= 1.4;
    }

    function familyOf(n: d3.HierarchyNode<HierarchyNode>): string | null {
      for (let c: typeof n | null = n; c; c = c.parent)
        if (c.data.rank === "family") return c.data.name;
      return null;
    }

    function nodeColor(n: d3.HierarchyNode<HierarchyNode>): string {
      const rank = n.data.rank;
      if (rank && RANK_COLORS[rank]) return RANK_COLORS[rank];
      const f = familyOf(n);
      return f ? colorScale(f) : "#94a3b8";
    }

    const isSpecies = (d: d3.HierarchyNode<HierarchyNode>) => d.data.rank === "species";

    const allNodes = root.descendants();
    const allLinks = root.links();

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

    // --- SVG defs: gradient per link ---
    const defs = svg.append("defs");
    allLinks.forEach((link, i) => {
      const sourcePos = radialPoint((link.source as any).x, (link.source as any).y);
      const targetPos = radialPoint((link.target as any).x, (link.target as any).y);
      const grad = defs
        .append("linearGradient")
        .attr("id", `link-grad-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", sourcePos[0]).attr("y1", sourcePos[1])
        .attr("x2", targetPos[0]).attr("y2", targetPos[1]);
      grad.append("stop").attr("offset", "0%").attr("stop-color", nodeColor(link.source)).attr("stop-opacity", 0.8);
      grad.append("stop").attr("offset", "100%").attr("stop-color", nodeColor(link.target)).attr("stop-opacity", 0.8);
    });

    const g = svg.append("g");

    // --- Links ---
    const linkGen = d3
      .linkRadial<d3.HierarchyLink<HierarchyNode>, d3.HierarchyPointNode<HierarchyNode>>()
      .angle((d) => (d as any).x)
      .radius((d) => (d as any).y);

    const linkSelection = g.append("g").attr("fill", "none")
      .selectAll<SVGPathElement, d3.HierarchyPointLink<HierarchyNode>>("path")
      .data(allLinks).join("path")
      .attr("class", (d) => isSpecies(d.target) ? "link species-link" : "link")
      .attr("d", linkGen as any)
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
      const fill = isCurrent ? color : lightTint(color, 0.82);
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
    const scale0 = Math.min(cw / (x1 - x0), ch / (y1 - y0), 1.2);
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
      svg, g, nodeSelection, linkSelection, nodeToAncestors,
      nodeColor, isSpecies, currentSnakeId, shouldBloom,
      cw, ch, cx, cy, scale0, zoomBehavior,
      onSpeciesClick: (id) => router.push(`/snakes/${id}`),
      onTaxonomyNodeClick: handleTaxonomyNodeClick,
    });
    updateSpeciesVisibility = interactions.updateSpeciesVisibility;
    interactions.updateSpeciesVisibility(scale0);

    const bloomTimer = setTimeout(() => { hasBloomedRef.current = true; }, 0);

    return () => {
      clearTimeout(bloomTimer);
      interactions.cleanup();
    };
  }, [hierarchy, colorScale, currentSnakeId, router]);

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
      <p className="absolute bottom-2 left-2 text-xs text-stone-400 pointer-events-none">
        Drag to pan · Scroll to zoom · Click node to focus · R to reset view ·
        Hover to trace lineage
      </p>
      <TreeLegend />
    </div>
  );
}
