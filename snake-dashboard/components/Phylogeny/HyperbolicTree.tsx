"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";

interface Props {
  root: HierarchyNode;
  currentSnakeId?: string;
}

const RADIUS = 2800;
const SPECIES_ZOOM_THRESHOLD = 1.8;
const SPECIES_LABEL_ZOOM = 2.5;

const BLOOM_BASE_DELAY = 200;
const BLOOM_DURATION = 600;

// Families — warm-to-cool spectrum, high contrast between neighbors
const FAMILY_PALETTE = [
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
const RANK_COLORS: Record<string, string> = {
  suborder: "#2d3436",   // charcoal
  infraorder: "#6c5ce7", // soft purple
  clade: "#00b894",      // mint
};

function nodeRadius(d: d3.HierarchyNode<HierarchyNode>): number {
  switch (d.data.rank) {
    case "suborder":
      return 220;
    case "infraorder":
      return d.children && d.children.length > 0 ? 140 : 80;
    case "clade":
      return 110;
    case "family":
      return 80;
    case "genus":
      return 50;
    case "species":
      return 28;
    default:
      return 30;
  }
}

function fontSize(d: d3.HierarchyNode<HierarchyNode>): number {
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

function fontWeight(d: d3.HierarchyNode<HierarchyNode>): string {
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

function linkWidth(depth: number): number {
  return Math.max(2, 18 - depth * 3.5);
}

function radialPoint(angle: number, radius: number): [number, number] {
  return [
    radius * Math.cos(angle - Math.PI / 2),
    radius * Math.sin(angle - Math.PI / 2),
  ];
}

function convexHull(points: [number, number][]): [number, number][] | null {
  if (points.length < 3) return null;
  return d3.polygonHull(points);
}

export function HyperbolicTree({ root: rootData, currentSnakeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

    const isSpecies = (d: d3.HierarchyNode<HierarchyNode>) =>
      d.data.rank === "species";

    const allNodes = root.descendants();
    const allLinks = root.links();

    // --- Build ancestor lookup for path highlighting ---
    const nodeToAncestors = new Map<
      d3.HierarchyNode<HierarchyNode>,
      Set<d3.HierarchyNode<HierarchyNode>>
    >();
    allNodes.forEach((n) => {
      const ancestors = new Set<d3.HierarchyNode<HierarchyNode>>();
      for (let cur: d3.HierarchyNode<HierarchyNode> | null = n; cur; cur = cur.parent) {
        ancestors.add(cur);
      }
      nodeToAncestors.set(n, ancestors);
    });

    // --- SVG defs: gradient per link ---
    const defs = svg.append("defs");

    allLinks.forEach((link, i) => {
      const sourcePos = radialPoint(
        (link.source as any).x,
        (link.source as any).y
      );
      const targetPos = radialPoint(
        (link.target as any).x,
        (link.target as any).y
      );
      const grad = defs
        .append("linearGradient")
        .attr("id", `link-grad-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", sourcePos[0])
        .attr("y1", sourcePos[1])
        .attr("x2", targetPos[0])
        .attr("y2", targetPos[1]);

      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", nodeColor(link.source))
        .attr("stop-opacity", 0.8);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", nodeColor(link.target))
        .attr("stop-opacity", 0.8);
    });

    const g = svg.append("g");

    // --- Convex hull petals ---
    const familyGroups = new Map<string, [number, number][]>();
    allNodes.forEach((n) => {
      const fam = familyOf(n);
      if (!fam) return;
      const [px, py] = radialPoint((n as any).x, (n as any).y);
      if (!familyGroups.has(fam)) familyGroups.set(fam, []);
      familyGroups.get(fam)!.push([px, py]);
    });

    const hullGroup = g.append("g").attr("class", "hulls");
    familyGroups.forEach((points, fam) => {
      const hull = convexHull(points);
      if (!hull) return;
      hullGroup
        .append("path")
        .attr("d", `M${hull.map((p) => p.join(",")).join("L")}Z`)
        .attr("fill", colorScale(fam))
        .attr("fill-opacity", 0)
        .attr("stroke", colorScale(fam))
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 2)
        .transition()
        .delay(BLOOM_BASE_DELAY * 4)
        .duration(BLOOM_DURATION * 2)
        .ease(d3.easeCubicOut)
        .attr("fill-opacity", 0.06)
        .attr("stroke-opacity", 0.1);
    });

    // --- Links ---
    const linkGen = d3
      .linkRadial<
        d3.HierarchyLink<HierarchyNode>,
        d3.HierarchyPointNode<HierarchyNode>
      >()
      .angle((d) => (d as any).x)
      .radius((d) => (d as any).y);

    const linkSelection = g
      .append("g")
      .attr("fill", "none")
      .selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>("path")
      .data(allLinks)
      .join("path")
      .attr("class", (d) =>
        isSpecies(d.target) ? "link species-link" : "link"
      )
      .attr("d", linkGen as any)
      .attr("stroke", (_d, i) => `url(#link-grad-${i})`)
      .attr("stroke-width", (d) => linkWidth(d.source.depth))
      .attr("stroke-linecap", "round")
      .attr("stroke-opacity", 0);

    linkSelection
      .transition()
      .delay((d) => {
        const depth = d.source.depth;
        return isSpecies(d.target) ? 0 : BLOOM_BASE_DELAY * depth;
      })
      .duration(BLOOM_DURATION)
      .ease(d3.easeCubicOut)
      .attr("stroke-opacity", (d) => (isSpecies(d.target) ? 0 : 0.7));

    // --- Nodes ---
    const nodeSelection = g
      .append("g")
      .selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>("g")
      .data(allNodes)
      .join("g")
      .attr("class", (d) =>
        isSpecies(d) ? "node species-node" : "node"
      )
      .attr("transform", (d) => {
        const [x, y] = radialPoint((d as any).x, (d as any).y);
        return `translate(${x},${y})`;
      });

    // Circles
    nodeSelection.each(function (d) {
      const el = d3.select(this);
      const r = nodeRadius(d);
      const isCurrent = d.data.id === currentSnakeId;
      const color = isCurrent ? "#f59e0b" : nodeColor(d);
      const isSpec = isSpecies(d);

      el.append("circle")
        .attr("r", r)
        .attr("fill", color)
        .attr("fill-opacity", isSpec ? 0 : 1)
        .attr("stroke", isCurrent ? "#fbbf24" : "rgba(255,255,255,0.5)")
        .attr("stroke-width", isCurrent ? 3 : Math.max(1.5, r * 0.05))
        .attr("stroke-opacity", isSpec ? 0 : 1)
        .attr("transform", isSpec ? "scale(1)" : "scale(0)")
        .transition()
        .delay(isSpec ? 0 : BLOOM_BASE_DELAY * d.depth)
        .duration(BLOOM_DURATION)
        .ease(d3.easeBackOut.overshoot(0.8))
        .attr("transform", "scale(1)");
    });

    // Labels
    nodeSelection
      .append("text")
      .attr("x", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => `${fontSize(d)}px`)
      .attr("font-weight", (d) => fontWeight(d))
      .style("font-style", (d) =>
        d.data.rank === "genus" || d.data.rank === "species"
          ? "italic"
          : "normal"
      )
      .attr("fill", (d) => {
        if (d.data.id === currentSnakeId) return "#fefce8";
        if (isSpecies(d)) return "#44403c";
        return "#ffffff";
      })
      .attr("opacity", 0)
      .attr("class", (d) => (isSpecies(d) ? "species-label" : ""))
      .text((d) => {
        if (
          d.data.rank === "infraorder" &&
          (!d.children || d.children.length === 0)
        ) {
          return `${d.data.name} (blind snakes)`;
        }
        return d.data.name;
      })
      .transition()
      .delay((d) =>
        isSpecies(d) ? 0 : BLOOM_BASE_DELAY * d.depth + BLOOM_DURATION * 0.5
      )
      .duration(BLOOM_DURATION * 0.6)
      .ease(d3.easeCubicOut)
      .attr("opacity", (d) => (isSpecies(d) ? 0 : 1));

    // Tooltips
    nodeSelection
      .append("title")
      .text((d) =>
        d.ancestors().map((a) => a.data.name).reverse().join(" → ")
      );

    // Species start hidden
    g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(
      ".species-node"
    )
      .style("opacity", "0")
      .style("pointer-events", "none")
      .style("transition", "opacity 0.2s ease");

    g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(
      ".species-link"
    ).style("transition", "stroke-opacity 0.2s ease");

    // --- Hover: highlight ancestor path, blur the rest ---
    let hoverActive = false;

    function highlightPath(
      target: d3.HierarchyNode<HierarchyNode>
    ) {
      hoverActive = true;
      const ancestors = nodeToAncestors.get(target)!;

      // Dim all non-species nodes + labels
      nodeSelection
        .filter((d) => !isSpecies(d))
        .transition()
        .duration(200)
        .style("opacity", (d) => (ancestors.has(d) ? "1" : "0.15"));

      // Dim all non-species links
      linkSelection
        .filter((d) => !isSpecies(d.target))
        .transition()
        .duration(200)
        .attr(
          "stroke-opacity",
          (d) =>
            ancestors.has(d.source) && ancestors.has(d.target) ? 0.9 : 0.06
        );

      // Dim hulls
      hullGroup
        .selectAll("path")
        .transition()
        .duration(200)
        .attr("fill-opacity", 0.02)
        .attr("stroke-opacity", 0.04);

      // If hovering a genus, also reveal its species
      if (target.data.rank === "genus" && target.children) {
        g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(
          ".species-node"
        )
          .filter((s) => s.parent === target)
          .style("opacity", "1")
          .style("pointer-events", "auto")
          .select("circle")
          .attr("fill-opacity", 1)
          .attr("stroke-opacity", 1);
        g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(
          ".species-node"
        )
          .filter((s) => s.parent === target)
          .select(".species-label")
          .attr("opacity", 1);
        g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(
          ".species-link"
        )
          .filter((l) => l.source === target)
          .attr("stroke-opacity", 0.7);
      }
    }

    function clearHighlight() {
      hoverActive = false;
      const currentZoom =
        (svg.node() as any).__currentZoomScale || 1;

      // Restore non-species nodes
      nodeSelection
        .filter((d) => !isSpecies(d))
        .transition()
        .duration(300)
        .style("opacity", "1");

      // Restore non-species links
      linkSelection
        .filter((d) => !isSpecies(d.target))
        .transition()
        .duration(300)
        .attr("stroke-opacity", 0.7);

      // Restore hulls
      hullGroup
        .selectAll("path")
        .transition()
        .duration(300)
        .attr("fill-opacity", 0.06)
        .attr("stroke-opacity", 0.1);

      // Hide species again if below zoom threshold
      if (currentZoom < SPECIES_ZOOM_THRESHOLD) {
        g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(
          ".species-node"
        )
          .style("opacity", "0")
          .style("pointer-events", "none")
          .select("circle")
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0);
        g.selectAll(".species-label").attr("opacity", 0);
        g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(
          ".species-link"
        ).attr("stroke-opacity", 0);
      }
    }

    nodeSelection
      .filter((d) => !isSpecies(d))
      .on("mouseenter", function (_event, d) {
        highlightPath(d);
      })
      .on("mouseleave", function () {
        clearHighlight();
      });

    // --- Click to zoom ---
    nodeSelection.style("cursor", "pointer").on("click", (event, d) => {
      event.stopPropagation();
      zoomToNode(d);
    });

    // --- Bounding box for initial view ---
    const nonSpecies = allNodes.filter((n) => !isSpecies(n));
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    nonSpecies.forEach((n) => {
      const [px, py] = radialPoint((n as any).x, (n as any).y);
      const r = nodeRadius(n);
      x0 = Math.min(x0, px - r);
      y0 = Math.min(y0, py - r);
      x1 = Math.max(x1, px + r);
      y1 = Math.max(y1, py + r);
    });
    const pad = 150;
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    const bw = x1 - x0;
    const bh = y1 - y0;

    const cw = Math.max(container.clientWidth, 400);
    const ch = Math.max(container.clientHeight, 300);
    const scale0 = Math.min(cw / bw, ch / bh, 1.2);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    function updateSpeciesVisibility(scale: number) {
      (svg.node() as any).__currentZoomScale = scale;
      if (hoverActive) return; // don't fight with hover highlight
      const show = scale >= SPECIES_ZOOM_THRESHOLD;
      const showLabels = scale >= SPECIES_LABEL_ZOOM;

      g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(
        ".species-node"
      )
        .style("opacity", show ? "1" : "0")
        .style("pointer-events", show ? "auto" : "none")
        .select("circle")
        .attr("fill-opacity", show ? 1 : 0)
        .attr("stroke-opacity", show ? 1 : 0);

      g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(
        ".species-link"
      ).attr("stroke-opacity", show ? 0.7 : 0);

      g.selectAll(".species-label").attr("opacity", showLabels ? 1 : 0);
    }

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        updateSpeciesVisibility(event.transform.k);
      });

    svg
      .attr("viewBox", `0 0 ${cw} ${ch}`)
      .call(zoomBehavior as any)
      .call(
        (zoomBehavior as any).transform,
        d3.zoomIdentity
          .translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0)
          .scale(scale0)
      );

    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
      svg
        .transition()
        .duration(750)
        .ease(d3.easeCubicInOut)
        .call(
          (zoomBehavior as any).transform,
          d3.zoomIdentity
            .translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0)
            .scale(scale0)
        );
    });

    function zoomToNode(target: d3.HierarchyPointNode<HierarchyNode>) {
      let tx0 = Infinity,
        ty0 = Infinity,
        tx1 = -Infinity,
        ty1 = -Infinity;
      target.each((n) => {
        const [px, py] = radialPoint((n as any).x, (n as any).y);
        const r = nodeRadius(n);
        tx0 = Math.min(tx0, px - r);
        ty0 = Math.min(ty0, py - r);
        tx1 = Math.max(tx1, px + r);
        ty1 = Math.max(ty1, py + r);
      });
      const tpad = 100;
      tx0 -= tpad;
      ty0 -= tpad;
      tx1 += tpad;
      ty1 += tpad;
      const tbw = tx1 - tx0;
      const tbh = ty1 - ty0;
      const tscale = Math.min(cw / tbw, ch / tbh, 4);
      const tcx = (tx0 + tx1) / 2;
      const tcy = (ty0 + ty1) / 2;

      svg
        .transition()
        .duration(750)
        .ease(d3.easeCubicInOut)
        .call(
          (zoomBehavior as any).transform,
          d3.zoomIdentity
            .translate(cw / 2 - tcx * tscale, ch / 2 - tcy * tscale)
            .scale(tscale)
        );
    }
  }, [hierarchy, colorScale, currentSnakeId]);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 min-h-0 overflow-hidden bg-stone-50/50 rounded-lg"
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "grab" }}
      />
      <p className="absolute bottom-2 left-2 text-xs text-stone-400 pointer-events-none">
        Drag to pan · Scroll to zoom · Click node to zoom · Hover to trace
        lineage
      </p>
    </div>
  );
}
