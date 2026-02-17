"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { Snake } from "@/lib/types";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";

/** D3 partition node with animation state attached at runtime */
type PartitionNode = d3.HierarchyRectangularNode<HierarchyNode> & {
  current?: PartitionNode;
  target?: { x0: number; x1: number; y0: number; y1: number };
};

interface PhylogenyChartProps {
  /** Pre-built hierarchy (e.g. from buildFullSnakeHierarchy). When set, family/snakes are ignored for tree shape. */
  root?: HierarchyNode;
  /** Used when root is not provided: single-family view. */
  family?: string;
  /** Used when root is not provided. */
  snakes?: Snake[];
  currentSnakeId?: string;
  /** When true, render the chart only (no modal/button). For use on dedicated phylogeny page. */
  standalone?: boolean;
}

export function PhylogenyChart({ root: rootProp, family, snakes = [], currentSnakeId, standalone = false }: PhylogenyChartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const shouldRenderChart = standalone || isOpen;

  // Use pre-built root or build from family + snakes
  const data: HierarchyNode = useMemo(() => {
    if (rootProp) return rootProp;
    const root: HierarchyNode = { name: family!, children: [], rank: "family" };
    const genusMap = new Map<string, HierarchyNode>();

    snakes.forEach((snake) => {
      let genusNode = genusMap.get(snake.genus);
      if (!genusNode) {
        genusNode = { name: snake.genus, children: [], rank: "genus" };
        genusMap.set(snake.genus, genusNode);
        root.children!.push(genusNode);
      }
      genusNode.children!.push({
        name: snake.commonName,
        value: 1,
        id: snake.id,
        rank: "species",
      });
    });

    return root;
  }, [rootProp, family, snakes]);

  useEffect(() => {
    if (!shouldRenderChart || !svgRef.current) return;

    const width = 800;
    const height = 800; // Increased height for better visibility
    const radius = width / 6;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`)
      .style("font", "12px sans-serif");

    // Color scale (root may have 0+ children)
    const numSiblings = data.children?.length ?? 0;
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, Math.max(numSiblings + 1, 1)));

    // Partition layout
    const hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const root = d3.partition<HierarchyNode>().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
    root.each((d) => {
      (d as PartitionNode).current = d as PartitionNode;
    });

    // Arc generator
    const arc = d3
      .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    // Draw arcs
    const path = svg
      .append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", (d) => {
        while (d.depth > 1) d = d.parent!;
        return color(d.data.name);
      })
      .attr("fill-opacity", (d) =>
        arcVisible((d as PartitionNode).current) ? (d.children ? 0.6 : 0.4) : 0
      )
      .attr("pointer-events", (d) => (arcVisible((d as PartitionNode).current) ? "auto" : "none"))
      .attr("d", (d) => arc((d as PartitionNode).current!));

    // Add tooltips
    path.append("title").text(
      (d) =>
        `${d
          .ancestors()
          .map((d) => d.data.name)
          .reverse()
          .join("/")}\n${d.value?.toLocaleString()}`
    );

    // Add labels
    const label = svg
      .append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d) => +labelVisible((d as PartitionNode).current))
      .attr("transform", (d) => labelTransform((d as PartitionNode).current))
      .text((d) => d.data.name)
      // Highlight current snake
      .style("font-weight", (d) => d.data.id === currentSnakeId ? "bold" : "normal")
      .style("fill", (d) => d.data.id === currentSnakeId ? "#000" : null);

    // Parent circle (center)
    const parent = svg
      .append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

    // Handle clicks
    path
      .filter((d) => !!d.children)
      .style("cursor", "pointer")
      .on("click", clicked);
      
    // Handle leaf clicks (navigation)
    path
      .filter((d) => !d.children)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (d.data.id) {
           if (!standalone) setIsOpen(false);
           router.push(`/snakes/${d.data.id}`);
        }
      });

    function clicked(event: unknown, p: PartitionNode) {
      parent.datum(p.parent || root);

      root.each((d) => {
          (d as PartitionNode).target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
          };
      });

      const t = path.transition().duration(750);

      path
        .transition(t)
        .tween("data", (d) => {
          const node = d as PartitionNode;
          const target = node.target;
          if (!target || !node.current) return () => {};
          const i = d3.interpolate(node.current, target);
          return (t: number) => { node.current = i(t) as PartitionNode; };
        })
        .filter(function (d) {
          const opacity = (this as SVGPathElement).getAttribute("fill-opacity");
          const target = (d as PartitionNode).target;
          return !!(Number(opacity) || (target && arcVisible(target)));
        })
        .attr("fill-opacity", (d) =>
          arcVisible((d as PartitionNode).target!) ? (d.children ? 0.6 : 0.4) : 0
        )
        .attr("pointer-events", (d) =>
          arcVisible((d as PartitionNode).target!) ? "auto" : "none"
        )
        .attrTween("d", (d) => () => arc((d as PartitionNode).current!) ?? "");

      label
        .filter(function (d) {
          const opacity = (this as SVGTextElement).getAttribute("fill-opacity");
          const target = (d as PartitionNode).target;
          return !!(Number(opacity) || (target && labelVisible(target)));
        })
        .transition()
        .duration(750)
        .attr("fill-opacity", (d) =>
          +labelVisible((d as PartitionNode).target!)
        )
        .attrTween("transform", (d) => () => labelTransform((d as PartitionNode).current!));
    }

    function arcVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d: any) {
      const x = ((d.x0 + d.x1) / 2) * 180 / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

  }, [shouldRenderChart, data, router, currentSnakeId, standalone]);

  // Chart only: standalone page or pre-built root (global phylogeny)
  if (standalone || rootProp) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-stone-50/50 rounded-xl">
        <svg ref={svgRef} width="800" height="800" style={{ maxWidth: "100%", height: "auto" }} />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="underline hover:text-stone-900 transition-colors text-left"
        style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)" }}
      >
        {family ?? "Phylogeny"}
      </button>

      {isOpen && (
        <>
           <div
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
             <div 
               className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto m-4"
               role="dialog"
               aria-modal="true"
             >
                <div className="flex items-center justify-between p-6 border-b border-stone-100">
                    <div>
                        <h2 className="text-2xl font-serif text-[#2c2c2c]">{family} Phylogeny</h2>
                        <p className="text-sm text-stone-500 mt-1">
                            Click segments to zoom in/out. Click outer names to view snake.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-stone-500" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-50/50">
                    <svg ref={svgRef} width="800" height="800" style={{ maxWidth: "100%", height: "auto" }} />
                </div>
             </div>
          </div>
        </>
      )}
    </>
  );
}
