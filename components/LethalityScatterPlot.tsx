"use client";

import { useEffect, useRef, useState } from "react";
import { select, pointer } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { Delaunay } from "d3-delaunay";
import type { Snake } from "@/lib/types";

interface LethalityScatterPlotProps {
  currentSnakeId: string;
  allSnakes: Snake[];
}

interface PlotPoint {
  id: string;
  name: string;
  potency: number;
  yield: number;
  isCurrent: boolean;
}

const MARGIN = { top: 12, right: 12, bottom: 36, left: 42 };
const CHART_SIZE = 260;
const INNER = CHART_SIZE - MARGIN.left - MARGIN.right;

const COLORS = {
  dot: "#d6d3d1",
  dotHover: "#78716c",
  current: "#ef4444",
  currentRing: "#ffffff",
  grid: "#f5f5f4",
  axis: "#a8a29e",
  quadrant: "#e7e5e4",
};

function prepareData(allSnakes: Snake[], currentId: string): PlotPoint[] {
  return allSnakes
    .filter((s) => s.dangerScoreComponents && s.venomClassification !== "Non-venomous")
    .map((s) => ({
      id: s.id,
      name: s.commonName,
      potency: s.dangerScoreComponents!.potencyScore,
      yield: s.dangerScoreComponents!.yieldScore,
      isCurrent: s.id === currentId,
    }));
}

export function LethalityScatterPlot({ currentSnakeId, allSnakes }: LethalityScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<PlotPoint | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const points = prepareData(allSnakes, currentSnakeId);
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${CHART_SIZE} ${CHART_SIZE}`);

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = scaleLinear().domain([0, 100]).range([0, INNER]);
    const y = scaleLinear().domain([0, 100]).range([INNER, 0]);

    // Gridlines
    const ticks = [25, 50, 75];
    g.selectAll(".grid-x")
      .data(ticks).join("line")
      .attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
      .attr("y1", 0).attr("y2", INNER)
      .attr("stroke", COLORS.grid).attr("stroke-dasharray", "2,3");
    g.selectAll(".grid-y")
      .data(ticks).join("line")
      .attr("x1", 0).attr("x2", INNER)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", COLORS.grid).attr("stroke-dasharray", "2,3");

    // Quadrant labels (very faint)
    const quadrants = [
      { label: "Low potency\nHigh yield", x: 15, y: 90 },
      { label: "High potency\nHigh yield", x: 85, y: 90 },
      { label: "Low potency\nLow yield", x: 15, y: 10 },
      { label: "High potency\nLow yield", x: 85, y: 10 },
    ];
    quadrants.forEach((q) => {
      const lines = q.label.split("\n");
      const textEl = g.append("text")
        .attr("x", x(q.x)).attr("y", y(q.y))
        .attr("text-anchor", "middle")
        .attr("fill", COLORS.quadrant)
        .style("font-size", "7px")
        .attr("pointer-events", "none");
      lines.forEach((line, i) => {
        textEl.append("tspan")
          .attr("x", x(q.x))
          .attr("dy", i === 0 ? 0 : 10)
          .text(line);
      });
    });

    // Axes
    const xAxis = axisBottom(x).tickValues([0, 25, 50, 75, 100]).tickSize(0);
    const yAxis = axisLeft(y).tickValues([0, 25, 50, 75, 100]).tickSize(0);

    g.append("g")
      .attr("transform", `translate(0,${INNER})`)
      .call(xAxis)
      .call((g) => g.select(".domain").attr("stroke", COLORS.axis))
      .call((g) => g.selectAll("text").attr("fill", COLORS.axis).style("font-size", "8px"));

    g.append("g")
      .call(yAxis)
      .call((g) => g.select(".domain").attr("stroke", COLORS.axis))
      .call((g) => g.selectAll("text").attr("fill", COLORS.axis).style("font-size", "8px"));

    // Axis labels
    g.append("text")
      .attr("x", INNER / 2).attr("y", INNER + 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#78716c").style("font-size", "10px")
      .text("Potency (LD₅₀) →");

    g.append("text")
      .attr("x", -INNER / 2).attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", "#78716c").style("font-size", "10px")
      .text("Yield (mg) →");

    // Voronoi for hover detection
    const delaunay = Delaunay.from(
      points,
      (d) => x(d.potency),
      (d) => y(d.yield),
    );

    // Invisible hover rect
    g.append("rect")
      .attr("width", INNER).attr("height", INNER)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx, my] = pointer(event);
        const idx = delaunay.find(mx, my);
        if (idx !== -1 && idx < points.length) {
          setHovered(points[idx]);
        }
      })
      .on("mouseleave", () => setHovered(null));

    // Background dots (non-current)
    g.selectAll(".dot-bg")
      .data(points.filter((p) => !p.isCurrent))
      .join("circle")
      .attr("cx", (d) => x(d.potency))
      .attr("cy", (d) => y(d.yield))
      .attr("r", 3)
      .attr("fill", COLORS.dot)
      .attr("pointer-events", "none");

    // Current snake dot (on top)
    const current = points.find((p) => p.isCurrent);
    if (current) {
      // White ring
      g.append("circle")
        .attr("cx", x(current.potency))
        .attr("cy", y(current.yield))
        .attr("r", 7)
        .attr("fill", COLORS.currentRing)
        .attr("stroke", COLORS.current)
        .attr("stroke-width", 2)
        .attr("pointer-events", "none");
      // Red fill
      g.append("circle")
        .attr("cx", x(current.potency))
        .attr("cy", y(current.yield))
        .attr("r", 5)
        .attr("fill", COLORS.current)
        .attr("pointer-events", "none");
      // Label
      const labelX = current.potency > 70 ? -10 : 10;
      const anchor = current.potency > 70 ? "end" : "start";
      g.append("text")
        .attr("x", x(current.potency) + labelX)
        .attr("y", y(current.yield) + 4)
        .attr("text-anchor", anchor)
        .attr("fill", COLORS.current)
        .style("font-size", "9px")
        .style("font-weight", "600")
        .text(current.name);
    }
  }, [allSnakes, currentSnakeId]);

  return (
    <div className="w-full mt-4">
      <h3 className="text-sm font-bold text-[#2c2c2c] mb-1">Lethality Breakdown</h3>
      <p className="text-xs text-stone-400 mb-2">
        Potency vs yield across all venomous species
      </p>

      <div className="relative">
        <svg ref={svgRef} className="w-full" style={{ maxWidth: CHART_SIZE }} />

        {/* Hover tooltip */}
        {hovered && !hovered.isCurrent && (
          <div
            className="absolute z-10 px-2.5 py-1.5 rounded-md bg-white border border-stone-200 shadow-md pointer-events-none"
            style={{
              left: `${(MARGIN.left + (hovered.potency / 100) * INNER) / CHART_SIZE * 100}%`,
              top: `${(MARGIN.top + (1 - hovered.yield / 100) * INNER) / CHART_SIZE * 100}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <p className="text-xs font-semibold text-stone-700">{hovered.name}</p>
            <p className="text-[10px] text-stone-500">
              Potency: {hovered.potency} · Yield: {hovered.yield}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
