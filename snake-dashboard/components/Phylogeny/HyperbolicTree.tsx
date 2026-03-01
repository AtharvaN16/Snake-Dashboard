"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import { hierarchy as buildHierarchy, cluster as buildCluster } from "d3-hierarchy";
import type { HierarchyNode as D3HierarchyNode, HierarchyPointNode, HierarchyPointLink } from "d3-hierarchy";
import { linkRadial as buildLinkRadial, line as buildLine, curveCatmullRom } from "d3-shape";
import { zoom as buildZoom, zoomIdentity } from "d3-zoom";
import type { ZoomBehavior } from "d3-zoom";
import { easeCubicOut, easeCubicInOut, easeBackOut } from "d3-ease";
import { forceSimulation, forceCollide, forceRadial } from "d3-force";
import type { SimulationNodeDatum } from "d3-force";
import { interpolateString } from "d3-interpolate";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";
import {
  Props,
  RADIUS,
  BLOOM_BASE_DELAY,
  BLOOM_DURATION,
  MAX_POTENCY_EXTENSION,
  familyColor,
  RANK_COLORS,
} from "./treeConstants";
import { VenomPills } from "./VenomPills";
import type { VenomSubModes } from "./VenomPills";
import { getPotencyExtension, getYieldRadius, getPotencyColor, isVenomous } from "./treeVenomLayout";
import { radialPoint, starburstPath, hexagonPath, roundedSquarePath, diamondPath } from "./treeGeometry";
import { nodeRadius, fontSize, fontWeight, linkWidth, computeNodeFill } from "./treeNodeStyles";
import { TreeLegend } from "./TreeLegend";
import { setupInteractions } from "./treeInteractions";
import taxonomyDescriptions from "@/data/taxonomy_descriptions.json";
import { TaxonomyInfoBox } from "./TaxonomyInfoBox";
import { RegionPills } from "@/components/RegionPills";
import { getAllSnakes } from "@/lib/snakeData";
import type { Continent, Snake } from "@/lib/types";
import { venomClassificationColors } from "./venomLegendConfig";

export function HyperbolicTree({ root: rootData, currentSnakeId }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasBloomedRef = useRef(false);
  const hasInitializedRegionFilterRef = useRef(false);
  const zoomScaleRef = useRef<number>(1);
  const colorModeRef = useRef<'family' | 'venom'>('family');
  const nodeColorRef = useRef<(n: D3HierarchyNode<HierarchyNode>) => string>(() => "#94a3b8");
  const isInitialRenderRef = useRef(true);
  const isInitialVenomRenderRef = useRef(true);
  const nodeBaseYRef = useRef<Map<string, number>>(new Map());
  const benchmarkGroupRef = useRef<Selection<SVGGElement, unknown, SVGGElement, unknown> | null>(null);
  const applyVenomFilterRef = useRef<((nodes: Set<HierarchyPointNode<HierarchyNode>> | null) => void) | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const viewportRef = useRef<{ cw: number; ch: number; scale0: number; cx: number; cy: number } | null>(null);
  const prevVenomSubsRef = useRef<VenomSubModes>({ classification: false, potency: false, yield: false });
  const refreshNodePositionsRef = useRef<(() => void) | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const [selectedTaxon, setSelectedTaxon] = useState<{name: string, description: string} | null>(null);
  const [venomSubs, setVenomSubs] = useState<VenomSubModes>({ classification: false, potency: false, yield: false });
  const [selectedRegion, setSelectedRegion] = useState<Continent | null>(null);
  const selectedRegionRef = useRef<Continent | null>(null);
  selectedRegionRef.current = selectedRegion;
  const applyRegionFilterRef = useRef<((region: Continent | null) => void) | null>(null);
  // colorMode is derived: any active venom sub → 'venom', otherwise 'family'
  const colorMode: 'family' | 'venom' = (venomSubs.classification || venomSubs.potency || venomSubs.yield) ? 'venom' : 'family';
  colorModeRef.current = colorMode;

  // Create a lookup map for snake data by id
  const snakeMap = useMemo(() => {
    const snakes = getAllSnakes();
    const map = new Map<string, Snake>();
    snakes.forEach(snake => map.set(snake.id, snake));
    return map;
  }, []);

  const uniqueContinents = useMemo(() => {
    const snakes = getAllSnakes();
    return Array.from(new Set(snakes.flatMap((s) => s.continents))).sort();
  }, []);

  const handleTaxonomyNodeClick = (node: HierarchyPointNode<HierarchyNode> | null) => {
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

  const hierarchy = useMemo(() => buildHierarchy(rootData), [rootData]);

  const isSpecies = (d: D3HierarchyNode<HierarchyNode>) => d.data.rank === "species";

  const nodeColor = useCallback((n: D3HierarchyNode<HierarchyNode>): string => {
    if (isSpecies(n) && n.data.id) {
      const snake = snakeMap.get(n.data.id);
      // Potency wins over classification when active (they're mutually exclusive via VenomPills toggle)
      if (venomSubs.potency) {
        return getPotencyColor(snake?.dangerScoreComponents?.potencyScore ?? 0);
      }
      if (venomSubs.classification && snake?.venomClassification) {
        return venomClassificationColors[snake.venomClassification] ?? "#94a3b8";
      }
      // yield-only: fall through to family colors (size encodes yield, not color)
    }
    const rank = n.data.rank;
    if (rank && RANK_COLORS[rank]) return RANK_COLORS[rank];

    function familyOf(node: D3HierarchyNode<HierarchyNode>): string | null {
      for (let c: typeof node | null = node; c; c = c.parent)
        if (c.data.rank === "family") return c.data.name;
      return null;
    }
    const f = familyOf(n);
    return f ? familyColor(f) : "#94a3b8";
  }, [venomSubs, snakeMap]);
  nodeColorRef.current = nodeColor;

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!svgEl || !container) return;

    const svg = select(svgEl);
    svg.selectAll("*").remove();
    svg.style("font", "11px var(--font-pangram-sans), system-ui, sans-serif");

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

    const clusterLayout = buildCluster<HierarchyNode>()
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
        const underHenophidia = (n: D3HierarchyNode<HierarchyNode>) => (n.data as HierarchyNode).name === "Henophidia";
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
        node: D3HierarchyNode<HierarchyNode>,
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
        node: D3HierarchyNode<HierarchyNode>,
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

    // Store base Y (radius) for all species — used by the venom potency effect to compute extensions
    nodeBaseYRef.current = new Map();
    allNodes.forEach(n => {
      if (n.data.rank === 'species' && n.data.id) {
        nodeBaseYRef.current.set(n.data.id, (n as any).y);
      }
    });

    // --- Ancestor lookup for path highlighting ---
    const nodeToAncestors = new Map<
      D3HierarchyNode<HierarchyNode>,
      Set<D3HierarchyNode<HierarchyNode>>
    >();
    allNodes.forEach((n) => {
      const ancestors = new Set<D3HierarchyNode<HierarchyNode>>();
      for (let cur: D3HierarchyNode<HierarchyNode> | null = n; cur; cur = cur.parent)
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

    // Benchmark group (rendered behind all nodes) — populated by the venom potency effect
    benchmarkGroupRef.current = g.insert("g", ":first-child") as unknown as Selection<SVGGElement, unknown, SVGGElement, unknown>;

    // --- Links: node centers; magnetic repulsion except for links within a family (family + its child branches) ---
    const linkGen = buildLinkRadial<HierarchyPointLink<HierarchyNode>, HierarchyPointNode<HierarchyNode>>()
      .angle((d) => (d as any).x)
      .radius((d) => (d as any).y);

    const REPEL_SAMPLES = 24;
    const REPEL_MARGIN = 12;

    function linkPath(link: HierarchyPointLink<HierarchyNode>): string {
      const src = link.source as HierarchyPointNode<HierarchyNode>;
      const tgt = link.target as HierarchyPointNode<HierarchyNode>;
      const familyOf = (n: D3HierarchyNode<HierarchyNode>) =>
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

      const line = buildLine<[number, number]>().curve(curveCatmullRom.alpha(0.5));
      return line(displaced) ?? "";
    }

    const linkSelection = g.append("g").attr("fill", "none")
      .selectAll<SVGPathElement, HierarchyPointLink<HierarchyNode>>("path")
      .data(allLinks).join("path")
      .attr("class", (d) => isSpecies(d.target) ? "link species-link" : "link")
      .attr("d", linkPath)
      .attr("stroke", (_d, i) => `url(#link-grad-${i})`)
      .attr("stroke-width", (d) => linkWidth(d.source.depth))
      .attr("stroke-linecap", "round")
      .attr("stroke-opacity", shouldBloom ? 0 : 0.7);

    const maxDepth = Math.max(...allNodes.map(n => n.depth));
    const bloomTotalDelay = BLOOM_BASE_DELAY * maxDepth + BLOOM_DURATION;

    let bloomRafId = 0;
    let bloomFinalizeTimer: ReturnType<typeof setTimeout> | null = null;
    if (shouldBloom) {
      bloomRafId = requestAnimationFrame(() => {
        bloomRafId = 0;
        linkSelection.each(function () {
          const pathEl = this as SVGPathElement;
          const len = pathEl.getTotalLength();
          const sel = select(this);
          if (len > 0) {
            sel
              .attr("stroke-dasharray", len)
              .attr("stroke-dashoffset", len)
              .attr("stroke-opacity", 0.7);
          } else {
            sel.attr("stroke-opacity", 0.7);
          }
        });
        linkSelection
          .transition("bloom")
          .delay((d) => BLOOM_BASE_DELAY * d.source.depth)
          .duration(BLOOM_DURATION)
          .ease(easeCubicOut)
          .attrTween("stroke-dashoffset", function () {
            const len = (this as SVGPathElement).getTotalLength();
            return (t) => String(len * (1 - t));
          });
      });

      // Defensive finalization: if any transition interrupts bloom, force links back
      // to fully drawn default state after the bloom window.
      bloomFinalizeTimer = setTimeout(() => {
        linkSelection
          .interrupt("bloom")
          .attr("stroke-dashoffset", 0)
          .attr("stroke-dasharray", null)
          .attr("stroke-opacity", 0.7);
      }, bloomTotalDelay + 40);
    }

    // --- Nodes ---
    const nodeSelection = g.append("g")
      .selectAll<SVGGElement, HierarchyPointNode<HierarchyNode>>("g")
      .data(allNodes).join("g")
      .attr("class", (d) => isSpecies(d) ? "node species-node" : "node")
      .attr("transform", (d) => {
        const [x, y] = radialPoint((d as any).x, (d as any).y);
        return `translate(${x},${y})`;
      });

    // Node shapes
    nodeSelection.each(function (d) {
      const el = select(this);
      const r = nodeRadius(d);
      const color = nodeColor(d);
      const isCurrent = !!currentSnakeId && d.data.id === currentSnakeId;
      const fill = computeNodeFill(d, nodeColor, colorMode, currentSnakeId);
      const rank = d.data.rank;
      const sw = Math.max(2, r * 0.06);

      let shape: Selection<SVGElement, unknown, null, undefined>;

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
          .ease(easeBackOut.overshoot(0.8)).attr("transform", "scale(1)");
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
        .duration(BLOOM_DURATION * 0.6).ease(easeCubicOut)
        .attr("opacity", 1);
    }

    // Tooltips
    nodeSelection.append("title")
      .text((d) => d.ancestors().map((a) => a.data.name).reverse().join(" → "));

    // Labels layer (after nodes so labels render on top and are never covered by dimmed node circles)
    const labelsLayer = g.append("g").attr("class", "labels-layer");

    g.selectAll<SVGPathElement, HierarchyPointLink<HierarchyNode>>(".species-link")
      .style("transition", "stroke-opacity 0.2s ease");

    // --- Bounding box for initial view ---
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    allNodes.forEach((n) => {
      const [px, py] = radialPoint((n as any).x, (n as any).y);
      const r = nodeRadius(n);
      x0 = Math.min(x0, px - r); y0 = Math.min(y0, py - r);
      x1 = Math.max(x1, px + r); y1 = Math.max(y1, py + r);
    });
    
    // Mobile-optimized padding for initial zoom
    const isMobile = window.innerWidth < 1024;
    const pad = isMobile ? 40 : 150;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;

    const cw = Math.max(container.clientWidth, 400);
    const ch = Math.max(container.clientHeight, 300);
    const extent = Math.max(x1 - x0, y1 - y0, 1); // avoid div by zero / NaN if no nodes
    const scale0 = Math.min(cw / extent, ch / extent, 1.2);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    // --- Zoom ---
    let updateSpeciesVisibility: (k: number) => void = () => {};
    const zoomBehavior = buildZoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        updateSpeciesVisibility(event.transform.k);
      });

    svg.attr("viewBox", `0 0 ${cw} ${ch}`)
      .call(zoomBehavior as any)
      .call(
        (zoomBehavior as any).transform,
        zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0)
      );

    zoomBehaviorRef.current = zoomBehavior;
    viewportRef.current = { cw, ch, scale0, cx, cy };

    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
      svg.transition().duration(750).ease(easeCubicInOut)
        .call(
          (zoomBehavior as any).transform,
          zoomIdentity.translate(cw / 2 - cx * scale0, ch / 2 - cy * scale0).scale(scale0)
        );
    });

    // --- Interactions ---
    const interactions = setupInteractions({
      svg, g, labelsLayer, nodeSelection, linkSelection, nodeToAncestors,
      allNodes, nodePoints,
      nodeColor, getNodeColor: () => nodeColorRef.current, isSpecies, currentSnakeId, shouldBloom,
      cw, ch, cx, cy, scale0, zoomScaleRef, zoomBehavior,
      getColorMode: () => colorModeRef.current,
      onSpeciesClick: (id) => router.push(`/snakes/${id}`),
      onTaxonomyNodeClick: handleTaxonomyNodeClick,
      onResetView: () => {
        setSelectedRegion(null);
        router.replace("/phylogeny");
      },
      getSelectedRegion: () => selectedRegionRef.current,
      getContinentForSpeciesId: (id) => snakeMap.get(id)?.continents,
    });
    updateSpeciesVisibility = interactions.updateSpeciesVisibility;
    applyRegionFilterRef.current = interactions.applyRegionFilter;
    applyVenomFilterRef.current = interactions.applyVenomFade;
    refreshNodePositionsRef.current = interactions.refreshNodePositions;
    resetViewRef.current = interactions.resetView;
    interactions.updateSpeciesVisibility(scale0);

    const bloomDelay = shouldBloom ? bloomTotalDelay : 0;
    const bloomTimer = setTimeout(() => { hasBloomedRef.current = true; }, bloomDelay);

    return () => {
      if (bloomRafId) cancelAnimationFrame(bloomRafId);
      if (bloomFinalizeTimer) clearTimeout(bloomFinalizeTimer);
      clearTimeout(bloomTimer);
      // Remove zoom/dblclick so they don’t accumulate on rebuild (effect re-run)
      svg.on(".zoom", null).on("dblclick", null);
      interactions.cleanup();
    };
  }, [hierarchy, currentSnakeId, router]);

  useEffect(() => {
    if (!hasInitializedRegionFilterRef.current) {
      hasInitializedRegionFilterRef.current = true;
      return;
    }
    applyRegionFilterRef.current?.(selectedRegion);
  }, [selectedRegion]);

  // Effect to update colors when colorMode changes (skip initial mount to avoid killing bloom)
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    const svg = select(svgRef.current);
    if (!svg.node() || !svg.selectAll(".node").size()) return;

    // Update node fills — interrupt any in-flight color transitions first
    svg.selectAll<SVGGElement, HierarchyPointNode<HierarchyNode>>(".node")
      .each(function(d) {
        const shape = select(this).select<SVGElement>("circle, path");
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
      defs.selectAll<SVGLinearGradientElement, HierarchyPointLink<HierarchyNode>>("linearGradient")
        .each(function(d) {
          if (!d || !d.source || !d.target) return;
          const link = d;
          select(this).selectAll("stop")
            .interrupt("color")
            .transition("color").duration(500)
            .attr("stop-color", (_stopD, i) => nodeColor(i === 0 ? link.source : link.target));
        });
    }

  }, [colorMode, nodeColor, currentSnakeId]);

  // Effect for venom geometry encoding — potency extends branches, yield scales node radii
  useEffect(() => {
    if (isInitialVenomRenderRef.current) {
      isInitialVenomRenderRef.current = false;
      return;
    }
    const svg = select(svgRef.current);
    if (!svg.node() || !svg.selectAll(".node").size()) return;

    const { classification, potency, yield: yieldActive } = venomSubs;
    const DURATION = 600;
    const ease = easeCubicInOut;
    const BASE_RADIUS = 28;

    type SpeciesData = HierarchyPointNode<HierarchyNode>;

    // 1. Compute target positions and radii for each species node
    const speciesUpdates = new Map<string, { newY: number; newR: number }>();
    svg.selectAll<SVGGElement, SpeciesData>(".species-node").each(d => {
      if (!d.data.id) return;
      const snake = snakeMap.get(d.data.id);
      const venomousNode = isVenomous(snake);
      const baseY = nodeBaseYRef.current.get(d.data.id) ?? (d as any).y;
      const extension = potency && venomousNode ? getPotencyExtension(snake) : 0;
      const newY = baseY + extension;
      const newR = yieldActive && venomousNode ? getYieldRadius(snake, BASE_RADIUS) : BASE_RADIUS;
      speciesUpdates.set(d.data.id, { newY, newR });
    });

    // 2. Run D3 force simulation when yield is active to spread nodes angularly,
    //    preventing large circles from overlapping their neighbors.
    if (yieldActive) {
      interface ForceNode extends SimulationNodeDatum {
        id: string;
        r: number;
        baseRadius: number;
      }
      const forceNodes: ForceNode[] = [];
      svg.selectAll<SVGGElement, SpeciesData>(".species-node").each(d => {
        if (!d.data.id) return;
        const update = speciesUpdates.get(d.data.id);
        if (!update) return;
        const [cx, cy] = radialPoint((d as any).x, update.newY);
        forceNodes.push({ id: d.data.id, x: cx, y: cy, r: update.newR, baseRadius: update.newY });
      });
      if (forceNodes.length > 0) {
        const sim = forceSimulation<ForceNode>(forceNodes)
          .force("collide", forceCollide<ForceNode>(n => n.r + 6).strength(0.8))
          .force("radial", forceRadial<ForceNode>(n => n.baseRadius, 0, 0).strength(1.0))
          .alphaDecay(0.05)
          .stop();
        for (let i = 0; i < 100; i++) sim.tick();
        const forceMap = new Map<string, ForceNode>(forceNodes.map(n => [n.id, n]));
        // Convert back to polar: our convention radialPoint(a, r) = (r·cos(a−π/2), r·sin(a−π/2))
        // so angle = atan2(y, x) + π/2
        svg.selectAll<SVGGElement, SpeciesData>(".species-node").each(d => {
          if (!d.data.id) return;
          const fn = forceMap.get(d.data.id);
          if (!fn) return;
          (d as any)._currentAngle = Math.atan2(fn.y!, fn.x!) + Math.PI / 2;
        });
      }
    } else {
      // Clear force-adjusted angles so nodes return to their original angular positions
      svg.selectAll<SVGGElement, SpeciesData>(".species-node").each(d => {
        delete (d as any)._currentAngle;
      });
    }

    // 3. Apply position and radius transitions to each species node
    svg.selectAll<SVGGElement, SpeciesData>(".species-node").each(function(d) {
      if (!d.data.id) return;
      const update = speciesUpdates.get(d.data.id);
      if (!update) return;

      // Store current target Y, radius, and angle on node datum for link redraw + hover detection
      (d as any)._currentY = update.newY;
      (d as any)._currentR = update.newR;
      const angle = (d as any)._currentAngle ?? (d as any).x;
      const [nx, ny] = radialPoint(angle, update.newY);
      select(this)
        .transition("venom-layout").duration(DURATION).ease(ease)
        .attr("transform", `translate(${nx},${ny})`);

      select(this).select("circle")
        .transition("venom-layout").duration(DURATION).ease(ease)
        .attr("r", update.newR);
    });

    // 4a. Redraw species links to follow force-adjusted positions
    const linkRadialGen = buildLinkRadial<HierarchyPointLink<HierarchyNode>, HierarchyPointNode<HierarchyNode>>()
      .angle((d: any) => (d as any)._currentAngle ?? d.x)
      .radius((d: any) => (d as any)._currentY ?? (d as any).y);

    svg.selectAll<SVGPathElement, HierarchyPointLink<HierarchyNode>>(".species-link")
      .transition("venom-layout").duration(DURATION).ease(ease)
      .attrTween("d", function(link) {
        const startD = this.getAttribute("d") ?? "";
        const endD = linkRadialGen(link) ?? "";
        const interpolator = interpolateString(startD, endD);
        return (t: number) => interpolator(t);
      });

    // 4b. Apply venom filter fade via interactions module (mirrors region view behavior:
    //     fades entire branches including intermediate nodes and links, not just leaf nodes)
    const anyVenomActive = classification || potency || yieldActive;
    if (anyVenomActive) {
      const venomPathNodes = new Set<HierarchyPointNode<HierarchyNode>>();
      svg.selectAll<SVGGElement, SpeciesData>(".species-node").each(d => {
        if (!d.data.id) return;
        const snake = snakeMap.get(d.data.id);
        if (!isVenomous(snake)) return;
        for (let n: HierarchyPointNode<HierarchyNode> | null = d; n; n = n.parent) {
          venomPathNodes.add(n);
        }
      });
      applyVenomFilterRef.current?.(venomPathNodes);
    } else {
      applyVenomFilterRef.current?.(null);
    }

    // 5. Update node colors (potency color scale or classification or family)
    svg.selectAll<SVGGElement, SpeciesData>(".node").each(function(d) {
      const shape = select(this).select<SVGElement>("circle, path");
      shape.interrupt("color");
      const newColor = nodeColor(d);
      const fill = computeNodeFill(d, nodeColor, colorMode, currentSnakeId);
      shape.transition("color").duration(500).attr("fill", fill).attr("stroke", newColor);
    });

    // 6. Update link gradients for new colors
    const defsEl = svg.select("defs");
    if (defsEl.node()) {
      defsEl.selectAll<SVGLinearGradientElement, HierarchyPointLink<HierarchyNode>>("linearGradient")
        .each(function(d) {
          if (!d || !d.source || !d.target) return;
          select(this).selectAll("stop")
            .interrupt("color")
            .transition("color").duration(500)
            .attr("stop-color", (_: unknown, i: number) => nodeColor(i === 0 ? d.source : d.target));
        });
    }

    // 7. Potency benchmark ring — radial gradient: transparent at center, vivid glow at Inland Taipan's rim
    const benchGroup = benchmarkGroupRef.current;
    if (benchGroup) {
      if (potency) {
        const taipanBaseY = nodeBaseYRef.current.get("inland-taipan") ?? RADIUS;
        const benchmarkR = taipanBaseY + MAX_POTENCY_EXTENSION;
        // Always recreate to handle toggle on/off/on correctly
        benchGroup.selectAll(".potency-benchmark-ring").remove();
        svg.select("defs").select("#potency-ring-fill").remove();
        // Radial gradient: transparent at center → pink → vivid purple at rim
        const grad = svg.select("defs").append("radialGradient")
          .attr("id", "potency-ring-fill")
          .attr("cx", "0").attr("cy", "0")
          .attr("r", benchmarkR)
          .attr("gradientUnits", "userSpaceOnUse");
        grad.append("stop").attr("offset", "0%").attr("stop-color", "#6a0572").attr("stop-opacity", 0);
        grad.append("stop").attr("offset", "72%").attr("stop-color", "#6a0572").attr("stop-opacity", 0);
        grad.append("stop").attr("offset", "86%").attr("stop-color", "#d966e0").attr("stop-opacity", 0.08);
        grad.append("stop").attr("offset", "94%").attr("stop-color", "#a01db0").attr("stop-opacity", 0.24);
        grad.append("stop").attr("offset", "100%").attr("stop-color", "#6a0572").attr("stop-opacity", 0.42);
        benchGroup.append("circle")
          .attr("class", "potency-benchmark-ring")
          .attr("r", benchmarkR)
          .attr("fill", "url(#potency-ring-fill)")
          .attr("stroke", "rgba(106, 5, 114, 0.62)")
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", "12,6")
          .attr("opacity", 0)
          .transition("venom-benchmark").duration(DURATION).ease(ease)
          .attr("opacity", 1);
      } else {
        benchGroup.selectAll<SVGCircleElement, unknown>(".potency-benchmark-ring")
          .transition("venom-benchmark").duration(DURATION).ease(ease)
          .attr("opacity", 0)
          .on("end", function() {
            select(this).remove();
            svg.select("defs").select("#potency-ring-fill").remove();
          });
      }
    }

    // 8. Auto-zoom to fit extended tree when potency is first activated
    const potencyJustEnabled = potency && !prevVenomSubsRef.current.potency;
    prevVenomSubsRef.current = { ...venomSubs };
    if (potencyJustEnabled && zoomBehaviorRef.current && viewportRef.current) {
      const { cw, ch, cx, cy } = viewportRef.current;
      const taipanBaseY = nodeBaseYRef.current.get("inland-taipan") ?? RADIUS;
      const maxR = taipanBaseY + MAX_POTENCY_EXTENSION;
      const pad = 200;
      // Fit a bounding box centred at (cx, cy) that contains the benchmark circle
      const fitW = 2 * (maxR + Math.abs(cx)) + pad * 2;
      const fitH = 2 * (maxR + Math.abs(cy)) + pad * 2;
      const s = Math.min(cw / fitW, ch / fitH, 0.95);
      select(svgRef.current)
        .transition("potency-zoom").duration(DURATION + 200).ease(easeCubicInOut)
        .call((zoomBehaviorRef.current as any).transform,
          zoomIdentity.translate(cw / 2 - cx * s, ch / 2 - cy * s).scale(s));
    }

    // 9. Rebuild Delaunay with updated positions so hover detection works on extended nodes
    refreshNodePositionsRef.current?.();

  }, [venomSubs, snakeMap, nodeColor, colorMode, currentSnakeId]);

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
      <div className="absolute top-2 right-2 hidden lg:flex flex-col gap-2 items-end">
        <VenomPills subModes={venomSubs} onChange={setVenomSubs} />
        <RegionPills
          selectedRegion={selectedRegion}
          onChange={setSelectedRegion}
          continents={uniqueContinents}
          singleColumn
        />
      </div>
      <p className="absolute bottom-2 left-2 text-xs text-stone-400 pointer-events-none hidden lg:block">
        Drag to pan · Scroll to zoom · Click node to focus ·
        Hover to trace lineage
      </p>
      <button
        onClick={() => resetViewRef.current?.()}
        className="absolute bottom-4 left-4 lg:hidden px-4 py-2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-full text-xs font-semibold text-stone-600 shadow-sm active:bg-stone-100 transition-colors z-20"
      >
        Reset View
      </button>
      <div className="hidden lg:block">
        <TreeLegend
          mode={colorMode === "venom" ? "venom" : "taxonomy"}
          venomSubs={venomSubs}
        />
      </div>
    </div>
  );
}
