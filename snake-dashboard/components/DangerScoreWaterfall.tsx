"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { getIntrinsicWeights, getEncounterModifier } from "@/lib/dangerScore";
import type { DangerScoreComponents } from "@/lib/types";

interface WaterfallStep {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  cumStart: number;
  cumEnd: number;
  kind: "additive" | "subtractive" | "total";
  color: string;
  rawScore?: number;
  weight?: number;
}

interface DangerScoreWaterfallProps {
  dangerScore: number;
  components: DangerScoreComponents;
  venomClassification?: string;
}

const COLORS = {
  lethality: "#ef4444",
  lethalityHover: "#f87171",
  clinical: "#f59e0b",
  clinicalHover: "#fbbf24",
  speed: "#eab308",
  speedHover: "#facc15",
  encounter: "#e11d48",
  encounterHover: "#f43f5e",
  final: "#44403c",
  finalHover: "#57534e",
};

const MARGIN = { top: 12, right: 8, bottom: 28, left: 30 };
const CHART_WIDTH = 300;
const CHART_HEIGHT = 160;
const INNER_W = CHART_WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

function buildSteps(components: DangerScoreComponents, dangerScore: number): WaterfallStep[] {
  const weights = getIntrinsicWeights();
  const encounterMod = getEncounterModifier(components.encounterScore);

  const leth = components.lethalityScore * weights.lethalityScore;
  const clin = components.clinicalScore * weights.clinicalScore;
  const spd = components.speedScore * weights.speedScore;
  const intrinsic = leth + clin + spd;
  const reduction = intrinsic * (1 - encounterMod);

  let cum = 0;
  const steps: WaterfallStep[] = [];

  steps.push({
    key: "lethality", label: "Lethality (doses/bite)", shortLabel: "Leth.",
    value: leth, cumStart: cum, cumEnd: cum + leth, kind: "additive",
    color: COLORS.lethality, rawScore: components.lethalityScore, weight: weights.lethalityScore,
  });
  cum += leth;

  steps.push({
    key: "clinical", label: "Clinical Severity", shortLabel: "Clin.",
    value: clin, cumStart: cum, cumEnd: cum + clin, kind: "additive",
    color: COLORS.clinical, rawScore: components.clinicalScore, weight: weights.clinicalScore,
  });
  cum += clin;

  steps.push({
    key: "speed", label: "Venom Speed", shortLabel: "Speed",
    value: spd, cumStart: cum, cumEnd: cum + spd, kind: "additive",
    color: COLORS.speed, rawScore: components.speedScore, weight: weights.speedScore,
  });

  steps.push({
    key: "encounter", label: "Encounter Modifier", shortLabel: "Enc.",
    value: reduction, cumStart: intrinsic - reduction, cumEnd: intrinsic, kind: "subtractive",
    color: COLORS.encounter,
  });

  steps.push({
    key: "final", label: "Final Score", shortLabel: "Final",
    value: dangerScore, cumStart: 0, cumEnd: dangerScore, kind: "total",
    color: COLORS.final,
  });

  return steps;
}

export function DangerScoreWaterfall({
  dangerScore,
  components,
}: DangerScoreWaterfallProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const steps = useMemo(() => buildSteps(components, dangerScore), [components, dangerScore]);
  const encounterMod = getEncounterModifier(components.encounterScore);

  const hoveredStep = hoveredKey ? steps.find((s) => s.key === hoveredKey) : null;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const y = d3.scaleLinear().domain([0, 100]).range([INNER_H, 0]);
    const x = d3.scaleBand()
      .domain(steps.map((s) => s.key))
      .range([0, INNER_W])
      .padding(0.3);

    const g = svg
      .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Gridlines
    g.selectAll(".gridline")
      .data([25, 50, 75])
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0).attr("x2", INNER_W)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#e7e5e4").attr("stroke-dasharray", "2,3");

    // Y-axis (minimal)
    const yAxis = d3.axisLeft(y).tickValues([0, 25, 50, 75, 100]).tickSize(0);
    g.append("g")
      .call(yAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").attr("fill", "#a8a29e").style("font-size", "9px"));

    // Connector lines between additive bars
    const additive = steps.filter((s) => s.kind === "additive");
    for (let i = 0; i < additive.length - 1; i++) {
      const from = additive[i];
      const to = additive[i + 1];
      g.append("line")
        .attr("x1", (x(from.key) ?? 0) + x.bandwidth())
        .attr("x2", x(to.key) ?? 0)
        .attr("y1", y(from.cumEnd))
        .attr("y2", y(to.cumStart))
        .attr("stroke", "#d6d3d1").attr("stroke-dasharray", "3,2").attr("stroke-width", 1);
    }

    // Connector from speed top to encounter top
    const speedStep = steps.find((s) => s.key === "speed")!;
    const encStep = steps.find((s) => s.key === "encounter")!;
    g.append("line")
      .attr("x1", (x("speed") ?? 0) + x.bandwidth())
      .attr("x2", x("encounter") ?? 0)
      .attr("y1", y(speedStep.cumEnd))
      .attr("y2", y(encStep.cumEnd))
      .attr("stroke", "#d6d3d1").attr("stroke-dasharray", "3,2").attr("stroke-width", 1);

    // Connector from encounter bottom to final top
    g.append("line")
      .attr("x1", (x("encounter") ?? 0) + x.bandwidth())
      .attr("x2", x("final") ?? 0)
      .attr("y1", y(encStep.cumStart))
      .attr("y2", y(dangerScore))
      .attr("stroke", "#d6d3d1").attr("stroke-dasharray", "3,2").attr("stroke-width", 1);

    // Diagonal stripe pattern for encounter bar
    const defs = svg.append("defs");
    defs.append("pattern")
      .attr("id", "stripe-encounter")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 4).attr("height", 4)
      .append("path")
      .attr("d", "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2")
      .attr("stroke", "rgba(255,255,255,0.25)").attr("stroke-width", 1);

    // Bars
    steps.forEach((step) => {
      const bx = x(step.key) ?? 0;
      const barH = Math.max(2, Math.abs(y(step.cumStart) - y(step.cumEnd)));
      const by = y(Math.max(step.cumStart, step.cumEnd));

      // Bar rect
      const rect = g.append("rect")
        .attr("x", bx).attr("y", by)
        .attr("width", x.bandwidth())
        .attr("height", barH)
        .attr("fill", step.color)
        .attr("rx", 2)
        .attr("cursor", "pointer")
        .attr("data-key", step.key);

      // Encounter bar gets stripe overlay
      if (step.kind === "subtractive") {
        g.append("rect")
          .attr("x", bx).attr("y", by)
          .attr("width", x.bandwidth()).attr("height", barH)
          .attr("fill", "url(#stripe-encounter)")
          .attr("rx", 2).attr("pointer-events", "none");
      }

      // Value label above bar
      const labelValue = step.kind === "subtractive"
        ? `-${step.value.toFixed(0)}`
        : step.kind === "total"
          ? `${dangerScore}`
          : `+${step.value.toFixed(0)}`;
      g.append("text")
        .attr("x", bx + x.bandwidth() / 2)
        .attr("y", by - 3)
        .attr("text-anchor", "middle")
        .attr("fill", "#78716c")
        .style("font-size", "9px")
        .style("font-weight", "600")
        .text(step.value >= 0.5 || step.kind === "total" ? labelValue : "");

      // Hover events
      rect
        .on("mouseenter", () => setHoveredKey(step.key))
        .on("mouseleave", () => setHoveredKey(null));
    });

    // X-axis labels
    steps.forEach((step) => {
      const bx = (x(step.key) ?? 0) + x.bandwidth() / 2;
      g.append("text")
        .attr("x", bx)
        .attr("y", INNER_H + 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#a8a29e")
        .style("font-size", "9px")
        .text(step.shortLabel);
    });
  }, [steps, dangerScore]);

  // Highlight hovered bar via CSS
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("rect[data-key]").each(function () {
      const el = d3.select(this);
      const key = el.attr("data-key");
      if (!hoveredKey) {
        el.attr("opacity", 1);
      } else if (key === hoveredKey) {
        const step = steps.find((s) => s.key === key);
        if (step) {
          const hoverMap: Record<string, string> = {
            lethality: COLORS.lethalityHover, clinical: COLORS.clinicalHover,
            speed: COLORS.speedHover, encounter: COLORS.encounterHover, final: COLORS.finalHover,
          };
          el.attr("fill", hoverMap[key] ?? step.color);
        }
        el.attr("opacity", 1);
      } else {
        el.attr("opacity", 0.35);
      }
    });
    return () => {
      svg.selectAll("rect[data-key]").attr("opacity", 1).each(function () {
        const el = d3.select(this);
        const key = el.attr("data-key");
        const step = steps.find((s) => s.key === key);
        if (step) el.attr("fill", step.color);
      });
    };
  }, [hoveredKey, steps]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-bold text-[#2c2c2c]">Danger Score</h3>
        <span className="text-lg font-extrabold tabular-nums text-[#2c2c2c]">
          {dangerScore}
          <span className="text-xs font-normal text-stone-400">/100</span>
        </span>
      </div>

      {/* SVG Chart */}
      <svg ref={svgRef} className="w-full" style={{ maxWidth: CHART_WIDTH }} />

      {/* Hover detail card */}
      <div
        className={`mt-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5
          transition-all duration-200
          ${hoveredStep ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ minHeight: "52px" }}
      >
        {hoveredStep && hoveredStep.key === "lethality" && (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: hoveredStep.color }} />
                <span className="text-sm font-medium text-stone-700">{hoveredStep.label}</span>
                <span className="text-xs text-stone-400">
                  {Math.round((hoveredStep.weight ?? 0) * 100)}% weight
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold tabular-nums text-stone-800">{hoveredStep.rawScore}</span>
                <span className="text-xs text-stone-400">/100</span>
                <span className="text-xs text-stone-400 ml-2">(+{hoveredStep.value.toFixed(1)})</span>
              </div>
            </div>
            <div className="mt-1.5 flex gap-3 text-xs text-stone-500">
              <span>Potency: <strong className="text-stone-700">{components.potencyScore}</strong>/100</span>
              <span>Yield: <strong className="text-stone-700">{components.yieldScore}</strong>/100</span>
            </div>
          </div>
        )}
        {hoveredStep && hoveredStep.kind === "additive" && hoveredStep.key !== "lethality" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: hoveredStep.color }} />
              <span className="text-sm font-medium text-stone-700">{hoveredStep.label}</span>
              <span className="text-xs text-stone-400">
                {Math.round((hoveredStep.weight ?? 0) * 100)}% weight
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold tabular-nums text-stone-800">{hoveredStep.rawScore}</span>
              <span className="text-xs text-stone-400">/100</span>
              <span className="text-xs text-stone-400 ml-2">(+{hoveredStep.value.toFixed(1)})</span>
            </div>
          </div>
        )}
        {hoveredStep && hoveredStep.kind === "subtractive" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: hoveredStep.color }} />
              <span className="text-sm font-medium text-stone-700">Encounter Modifier</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold tabular-nums text-stone-800">
                ×{encounterMod.toFixed(2)}
              </span>
              <span className="text-xs text-rose-600 ml-2">
                (-{hoveredStep.value.toFixed(1)} pts)
              </span>
            </div>
          </div>
        )}
        {hoveredStep && hoveredStep.kind === "total" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: hoveredStep.color }} />
              <span className="text-sm font-medium text-stone-700">Final Danger Score</span>
            </div>
            <span className="text-lg font-extrabold tabular-nums text-stone-800">
              {dangerScore}<span className="text-xs font-normal text-stone-400">/100</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
