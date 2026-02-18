"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";

interface Props {
  root: HierarchyNode;
  currentSnakeId?: string;
}

const RADIUS = 2800;
const SPECIES_ZOOM_THRESHOLD = 0; // always show species (even at initial fit-to-screen zoom)
const SPECIES_LABEL_ZOOM = 0; // always show species labels

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
  // Thicker at root (depth 0), thinner as we go outward
  // Base width 24 at root, decreases by 4.5 per level
  return Math.max(1.5, 40 - depth * 6.5);
}

function radialPoint(angle: number, radius: number): [number, number] {
  return [
    radius * Math.cos(angle - Math.PI / 2),
    radius * Math.sin(angle - Math.PI / 2),
  ];
}

/** Wavy starburst badge (like "People of San Francisco") using smooth cubic curves */
function starburstPath(r: number, bumps = 12, depth = 0.12): string {
  const outerR = r * (1 + depth);
  const innerR = r * (1 - depth);
  const points: [number, number][] = [];
  const total = bumps * 2; // alternating outer/inner
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2;
    const rad = i % 2 === 0 ? outerR : innerR;
    points.push([rad * Math.cos(angle), rad * Math.sin(angle)]);
  }
  // Build smooth closed path using Catmull-Rom → cubic bezier
  const n = points.length;
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const tension = 0.45; // higher = rounder bumps
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

/** Regular hexagon */
function hexagonPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = r * Math.cos(angle);
    const py = r * Math.sin(angle);
    pts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return pts.join("") + "Z";
}

/** Rounded square (centered, side = 2*r, corner radius ~25%) */
function roundedSquarePath(r: number): string {
  const cr = r * 0.28; // corner radius
  const s = r; // half-side
  return [
    `M${-s + cr},${-s}`,
    `L${s - cr},${-s}`,
    `Q${s},${-s} ${s},${-s + cr}`,
    `L${s},${s - cr}`,
    `Q${s},${s} ${s - cr},${s}`,
    `L${-s + cr},${s}`,
    `Q${-s},${s} ${-s},${s - cr}`,
    `L${-s},${-s + cr}`,
    `Q${-s},${-s} ${-s + cr},${-s}`,
    "Z",
  ].join(" ");
}

/** Simple diamond / rhombus — vertices at cardinal points */
function diamondPath(r: number): string {
  return `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`;
}


/** Mix a hex color toward white to create a light tint */
function lightTint(hex: string, amount = 0.82): string {
  const c = d3.color(hex)?.rgb();
  if (!c) return hex;
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return d3.rgb(mix(c.r), mix(c.g), mix(c.b)).formatHex();
}

export function HyperbolicTree({ root: rootData, currentSnakeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasBloomedRef = useRef(false);

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
      .attr("stroke-opacity", shouldBloom ? 0 : 0.7);

    if (shouldBloom) {
      linkSelection
        .transition()
        .delay((d) => {
          const depth = d.source.depth;
          return BLOOM_BASE_DELAY * depth;
        })
        .duration(BLOOM_DURATION)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", 0.7);
    }

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

    // Node shapes — rank-specific geometry with light fills + dark strokes
    nodeSelection.each(function (d) {
      const el = d3.select(this);
      const r = nodeRadius(d);
      const color = nodeColor(d);
      const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
      const fill = isCurrent ? color : lightTint(color, 0.82);
      const fillOpacity = isCurrent ? 0.85 : 1;
      const rank = d.data.rank;
      const sw = Math.max(2, r * 0.06); // stroke width scales with node size

      let shape: d3.Selection<SVGElement, unknown, null, undefined>;

      if (rank === "suborder") {
        shape = el.append("path")
          .attr("d", starburstPath(r, 18, 0.12))
          .attr("fill", fill)
          .attr("stroke", color)
          .attr("stroke-width", 5)
          .attr("stroke-linejoin", "round") as any;
      } else if (rank === "family") {
        const angleDeg = ((d as any).x * 180) / Math.PI - 90;
        shape = el.append("path")
          .attr("d", hexagonPath(r))
          .attr("fill", fill)
          .attr("stroke", color)
          .attr("stroke-width", Math.max(3, sw))
          .attr("stroke-linejoin", "round")
          .attr("transform", `rotate(${angleDeg})`) as any;
      } else if (rank === "genus") {
        // Rotate diamond so top/bottom vertices align with the radial direction
        const angleDeg = ((d as any).x * 180) / Math.PI - 90;
        shape = el.append("path")
          .attr("d", diamondPath(r))
          .attr("fill", fill)
          .attr("stroke", color)
          .attr("stroke-width", Math.max(2, sw))
          .attr("stroke-linejoin", "miter")
          .attr("transform", `rotate(${angleDeg})`) as any;
      } else if (rank === "infraorder") {
        shape = el.append("path")
          .attr("d", roundedSquarePath(r))
          .attr("fill", fill)
          .attr("stroke", color)
          .attr("stroke-width", Math.max(3, sw))
          .attr("stroke-linejoin", "round") as any;
      } else {
        // clade, species — circles
        shape = el.append("circle")
          .attr("r", r)
          .attr("fill", fill)
          .attr("stroke", color)
          .attr("stroke-width", isCurrent ? 4 : Math.max(2, sw)) as any;
      }

      if (shouldBloom) {
        shape
          .attr("transform", "scale(0)")
          .transition()
          .delay(BLOOM_BASE_DELAY * d.depth)
          .duration(BLOOM_DURATION)
          .ease(d3.easeBackOut.overshoot(0.8))
          .attr("transform", "scale(1)");
      }
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
      .attr("fill", (d) => nodeColor(d))
      .attr("opacity", shouldBloom ? 0 : 1)
      .attr("class", (d) => (isSpecies(d) ? "species-label" : ""))
      .text((d) => {
        if (
          d.data.rank === "infraorder" &&
          (!d.children || d.children.length === 0)
        ) {
          return `${d.data.name} (blind snakes)`;
        }
        return d.data.name;
      });

    if (shouldBloom) {
      nodeSelection.selectAll("text")
        .transition()
        .delay((_d: unknown, i: number) => {
          const d = allNodes[i];
          return BLOOM_BASE_DELAY * d.depth + BLOOM_DURATION * 0.5;
        })
        .duration(BLOOM_DURATION * 0.6)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);
    }

    // Tooltips
    nodeSelection
      .append("title")
      .text((d) =>
        d.ancestors().map((a) => a.data.name).reverse().join(" → ")
      );

    // Keep quick transitions for zoom/hover-driven visibility changes
    g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(".species-link")
      .style("transition", "stroke-opacity 0.2s ease");

    // --- Hover, search highlight, and click-focus ---
    let hoverActive = false;
    let searchHighlightNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
    let clickFocusNode: d3.HierarchyPointNode<HierarchyNode> | null = null;
    if (currentSnakeId) {
      const found = root.descendants().find((n) => n.data.id === currentSnakeId);
      searchHighlightNode = found ?? null;
    }

    function highlightSubtree(target: d3.HierarchyPointNode<HierarchyNode>) {
      // Click-focus: show target's descendant branches, fade everything else
      hoverActive = true;
      const subtreeNodes = new Set<d3.HierarchyNode<HierarchyNode>>();
      target.each((n) => subtreeNodes.add(n));

      nodeSelection
        .transition()
        .duration(250)
        .style("opacity", (d) => (subtreeNodes.has(d) ? "1" : "0.05"));

      // Disable interaction on faded-out nodes
      nodeSelection
        .style("pointer-events", (d) => (subtreeNodes.has(d) ? "auto" : "none"));

      linkSelection
        .transition()
        .duration(250)
        .attr(
          "stroke-opacity",
          (l) => (subtreeNodes.has(l.source) && subtreeNodes.has(l.target) ? 0.9 : 0.02)
        );
    }

    function highlightPath(
      target: d3.HierarchyNode<HierarchyNode>
    ) {
      hoverActive = true;
      const ancestors = nodeToAncestors.get(target)!;
      // Build the path: ancestors + target itself
      const pathNodes = new Set(ancestors);
      pathNodes.add(target);

      // Dim all nodes (including species) and links in one go — group opacity fades circle + label together
      nodeSelection
        .transition()
        .duration(200)
        .style("opacity", (d) => (pathNodes.has(d) ? "1" : "0.05"));

      // Disable interaction on faded-out nodes
      nodeSelection
        .style("pointer-events", (d) => (pathNodes.has(d) ? "auto" : "none"));

      linkSelection
        .transition()
        .duration(200)
        .attr(
          "stroke-opacity",
          (d) =>
            pathNodes.has(d.source) && pathNodes.has(d.target) ? 0.9 : 0.02
        );
    }

    function clearHighlight() {
      if (clickFocusNode) {
        highlightSubtree(clickFocusNode);
        return;
      }
      if (searchHighlightNode) {
        highlightPath(searchHighlightNode);
        return;
      }
      hoverActive = false;
      const currentZoom =
        (svg.node() as any).__currentZoomScale || 1;

      // Re-enable interaction on all nodes
      nodeSelection.style("pointer-events", "auto");

      nodeSelection
        .transition()
        .duration(300)
        .style("opacity", "1");

      linkSelection
        .transition()
        .duration(300)
        .attr("stroke-opacity", 0.7);

      updateSpeciesVisibility(currentZoom);
    }

    // --- Hover: highlight path + bright fill + floating label ---
    let hoverLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

    function showHoverEffect(el: SVGGElement, d: d3.HierarchyPointNode<HierarchyNode>) {
      const color = nodeColor(d);
      // Brighten the shape fill
      d3.select(el).select<SVGElement>("circle, path").attr("fill", color).attr("fill-opacity", 0.85);

      // If node already has a light label above, turn it dark
      const extLabel = d3.select(el).select(".ext-label");
      if (!extLabel.empty()) {
        extLabel.select("rect").attr("fill", color).attr("fill-opacity", 0.92);
        extLabel.select("text").attr("fill", "#fff").attr("font-weight", "600");
        return; // no duplicate hover label
      }

      // Otherwise add floating label above the node — fixed screen size regardless of zoom
      const r = nodeRadius(d);
      const [px, py] = radialPoint((d as any).x, (d as any).y);
      const k = (svg.node() as any).__currentZoomScale || 1;
      const invK = 1 / k;
      const gap = r + 24 * invK;
      hoverLabel = g.append("g").attr("class", "hover-label").attr("transform", `translate(${px},${py - gap})`);
      const labelText = d.data.name;
      const fs = 14 * invK;
      const padX = 8 * invK;
      const padY = 5 * invK;
      const rx = 6 * invK;
      const text = hoverLabel.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", `${fs}px`)
        .attr("font-weight", "600")
        .attr("fill", "#fff")
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text(labelText);
      const bbox = (text.node() as SVGTextElement).getBBox();
      hoverLabel.insert("rect", "text")
        .attr("x", bbox.x - padX)
        .attr("y", bbox.y - padY)
        .attr("width", bbox.width + padX * 2)
        .attr("height", bbox.height + padY * 2)
        .attr("rx", rx)
        .attr("fill", color)
        .attr("opacity", 0.92);
    }

    function clearHoverEffect(el: SVGGElement, d: d3.HierarchyPointNode<HierarchyNode>) {
      const color = nodeColor(d);
      const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
      const fill = isCurrent ? color : lightTint(color, 0.82);
      d3.select(el).select<SVGElement>("circle, path").attr("fill", fill).attr("fill-opacity", isCurrent ? 0.85 : 1);

      // Revert ext-label back to light style if present
      const extLabel = d3.select(el).select(".ext-label");
      if (!extLabel.empty()) {
        extLabel.select("rect").attr("fill", "#fff").attr("fill-opacity", 0.85);
        extLabel.select("text").attr("fill", color).attr("font-weight", "500");
      }

      if (hoverLabel) {
        hoverLabel.remove();
        hoverLabel = null;
      }
    }

    nodeSelection
      .on("mouseenter", function (_event, d) {
        if (clickFocusNode) return;
        // When search-highlighted, only allow hover on path nodes (non-path already has pointer-events:none)
        if (searchHighlightNode) {
          showHoverEffect(this as SVGGElement, d);
          return;
        }
        highlightPath(d);
        showHoverEffect(this as SVGGElement, d);
      })
      .on("mouseleave", function (_event, d) {
        clearHoverEffect(this as SVGGElement, d);
        if (searchHighlightNode) return; // don't clear the search highlight
        clearHighlight();
      });

    // No hover handlers for links (hover is node-only)

    // --- Click to zoom ---
    nodeSelection.style("cursor", "pointer").on("click", (event, d) => {
      event.stopPropagation();
      clickFocusNode = d;
      document.body.setAttribute("data-chart-zoomed", "true");
      highlightSubtree(d);
      zoomToNode(d);
    });

    // --- Bounding box for initial view (all nodes so nothing is clipped) ---
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    allNodes.forEach((n) => {
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

    // Threshold: if in-node font renders smaller than this on screen, hide it
    const MIN_READABLE_PX = 8;

    function updateSpeciesVisibility(scale: number) {
      (svg.node() as any).__currentZoomScale = scale;
      if (hoverActive) return; // don't fight with hover highlight
      const show = scale >= SPECIES_ZOOM_THRESHOLD;
      const showLabels = scale >= SPECIES_LABEL_ZOOM;

      g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(
        ".species-node"
      )
        .style("opacity", show ? "1" : "0")
        .style("pointer-events", show ? "auto" : "none");

      g.selectAll<SVGPathElement, d3.HierarchyLink<HierarchyNode>>(
        ".species-link"
      ).attr("stroke-opacity", show ? 0.7 : 0);

      g.selectAll(".species-label").attr("opacity", showLabels ? 1 : 0);

      // Light labels above nodes when in-node text is too small to read.
      // - Higher ranks (suborder, infraorder, clade, family): always eligible
      // - Species/genus: only when zoomed in (click-focus or search highlight)
      // - Highlighted snake: never (has its own dark search label)
      const invK = 1 / scale;
      const isZoomedIn = !!clickFocusNode || !!searchHighlightNode;

      // Remove all ext-labels and recreate as needed for current zoom
      g.selectAll(".ext-label").remove();

      g.selectAll<SVGGElement, d3.HierarchyPointNode<HierarchyNode>>(".node, .species-node")
        .each(function (nd) {
          const nodeEl = d3.select(this);
          const rank = nd.data.rank ?? "";
          const isHigherRank = rank === "suborder" || rank === "infraorder" || rank === "clade" || rank === "family";
          const isHighlighted = !!currentSnakeId && nd.data.id === currentSnakeId;
          const inNodeText = nodeEl.select<SVGTextElement>("text");

          // Skip highlighted snake — it has its own search label
          if (isHighlighted) return;

          // Species/genus ext-labels only in zoomed-in view
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

    updateSpeciesVisibility(scale0);

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

    // Click background to clear click-focus (but keep search highlight if present)
    svg.on("click", () => {
      if (!clickFocusNode) return;
      clickFocusNode = null;
      document.body.removeAttribute("data-chart-zoomed");
      clearHighlight();
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

    /** Zoom so the path from root to target (ancestors + target) fits in the viewport */
    function zoomToPath(target: d3.HierarchyPointNode<HierarchyNode>) {
      const ancestors = nodeToAncestors.get(target)!;
      const pathNodes = new Set(ancestors);
      pathNodes.add(target);
      let tx0 = Infinity,
        ty0 = Infinity,
        tx1 = -Infinity,
        ty1 = -Infinity;
      pathNodes.forEach((n) => {
        const [px, py] = radialPoint((n as any).x, (n as any).y);
        const r = nodeRadius(n);
        tx0 = Math.min(tx0, px - r);
        ty0 = Math.min(ty0, py - r);
        tx1 = Math.max(tx1, px + r);
        ty1 = Math.max(ty1, py + r);
      });
      const tpad = 500;
      tx0 -= tpad;
      ty0 -= tpad;
      tx1 += tpad;
      ty1 += tpad;
      const tbw = tx1 - tx0;
      const tbh = ty1 - ty0;
      const tscale = Math.min(cw / tbw, ch / tbh, 0.8);
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

    // When a snake is highlighted via search: show path, fade rest, zoom to path
    // Also add a persistent floating label above the highlighted node
    let searchLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

    function addSearchLabel(node: d3.HierarchyPointNode<HierarchyNode>) {
      const color = nodeColor(node);
      const r = nodeRadius(node);
      const [px, py] = radialPoint((node as any).x, (node as any).y);
      const k = (svg.node() as any).__currentZoomScale || 1;
      const invK = 1 / k;
      const gap = r + 24 * invK;
      searchLabel = g.append("g").attr("class", "search-label").attr("transform", `translate(${px},${py - gap})`);
      const fs = 14 * invK;
      const padX = 8 * invK;
      const padY = 5 * invK;
      const rx = 6 * invK;
      const text = searchLabel.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", `${fs}px`)
        .attr("font-weight", "600")
        .attr("fill", "#fff")
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text(node.data.name);
      const bbox = (text.node() as SVGTextElement).getBBox();
      searchLabel.insert("rect", "text")
        .attr("x", bbox.x - padX)
        .attr("y", bbox.y - padY)
        .attr("width", bbox.width + padX * 2)
        .attr("height", bbox.height + padY * 2)
        .attr("rx", rx)
        .attr("fill", color)
        .attr("opacity", 0.92);
    }

    if (searchHighlightNode) {
      document.body.setAttribute("data-chart-zoomed", "true");
      if (shouldBloom) {
        const afterBloom = BLOOM_BASE_DELAY * 6 + BLOOM_DURATION * 2;
        setTimeout(() => {
          highlightPath(searchHighlightNode!);
          zoomToPath(searchHighlightNode!);
          addSearchLabel(searchHighlightNode!);
          updateSpeciesVisibility((svg.node() as any).__currentZoomScale ?? scale0);
        }, afterBloom);
      } else {
        highlightPath(searchHighlightNode);
        zoomToPath(searchHighlightNode);
        addSearchLabel(searchHighlightNode);
        updateSpeciesVisibility((svg.node() as any).__currentZoomScale ?? scale0);
      }
    }

    // Defer so React Strict Mode's synchronous unmount/remount cycle
    // doesn't mark bloom as done before the second (real) render.
    const bloomTimer = setTimeout(() => {
      hasBloomedRef.current = true;
    }, 0);

    // --- Backspace / Delete: clear any focus/highlight and reset to default view ---
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (!clickFocusNode && !searchHighlightNode) return;
      e.preventDefault();
      clickFocusNode = null;
      searchHighlightNode = null;
      document.body.removeAttribute("data-chart-zoomed");
      hoverActive = false;

      // Remove search label and reset all node fills to light tint
      if (searchLabel) { searchLabel.remove(); searchLabel = null; }
      nodeSelection.each(function (nd) {
        const c = nodeColor(nd);
        d3.select(this).select<SVGElement>("circle, path")
          .attr("fill", lightTint(c, 0.82)).attr("fill-opacity", 1);
      });
      nodeSelection.style("pointer-events", "auto");
      nodeSelection.transition().duration(300).style("opacity", "1");
      linkSelection.transition().duration(300).attr("stroke-opacity", 0.7);

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
      updateSpeciesVisibility(scale0);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(bloomTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.removeAttribute("data-chart-zoomed");
    };
  }, [hierarchy, colorScale, currentSnakeId]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-0 overflow-hidden bg-stone-50/50"
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "grab" }}
      />
      <p className="absolute bottom-2 left-2 text-xs text-stone-400 pointer-events-none">
        Drag to pan · Scroll to zoom · Click node to focus · Backspace to
        reset · Hover to trace lineage
      </p>

      {/* Shape legend */}
      <div className="absolute bottom-3 right-3 pointer-events-none flex flex-col gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 shadow-sm border border-stone-200/60">
        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
          Taxonomy
        </span>
        {([
          ["suborder", "Suborder", "#2d3436"],
          ["infraorder", "Infraorder", "#6c5ce7"],
          ["clade", "Clade", "#00b894"],
          ["family", "Family", "#c44e52"],
          ["genus", "Genus", "#8172b3"],
          ["species", "Species", "#64b5cd"],
        ] as const).map(([rank, label, color]) => (
          <div key={rank} className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="-9 -9 18 18">
              {rank === "suborder" ? (
                <path
                  d={starburstPath(7, 18, 0.12)}
                  fill={lightTint(color)}
                  stroke={color}
                  strokeWidth={1.5}
                />
              ) : rank === "family" ? (
                <path
                  d={hexagonPath(7)}
                  fill={lightTint(color)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              ) : rank === "genus" ? (
                <path
                  d={diamondPath(7)}
                  fill={lightTint(color)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinejoin="miter"
                />
              ) : rank === "infraorder" ? (
                <path
                  d={roundedSquarePath(6)}
                  fill={lightTint(color)}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              ) : (
                <circle
                  r={rank === "species" ? 4 : 6}
                  fill={lightTint(color)}
                  stroke={color}
                  strokeWidth={1.5}
                />
              )}
            </svg>
            <span className="text-[11px] text-stone-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
