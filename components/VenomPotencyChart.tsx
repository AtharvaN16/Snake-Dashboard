"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { select, pointer } from "d3-selection";
import { scaleLog, scaleLinear, scaleSqrt } from "d3-scale";
import { area, line, curveLinear } from "d3-shape";
import { axisBottom } from "d3-axis";
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";
import { interpolateRgb } from "d3-interpolate";
import { Snake } from "@/lib/types";
import { getAllSnakes } from "@/lib/snakeData";
import { imputeDryYield } from "@/lib/dangerScore";
import { familyColor } from "@/components/Phylogeny/treeConstants";

interface VenomPotencyChartProps {
  currentSnake: Snake;
  medianLD50: number;
}

const EXCLUDED_CLASSIFICATIONS = new Set(["Non-venomous", "Mildly Venomous"]);

const REFERENCE_ANCHORS = [
  { id: "inland-taipan", name: "Inland Taipan", ld50: 0.025 },
  { id: "black-mamba",   name: "Black Mamba",   ld50: 0.96  },
  { id: "king-cobra",    name: "King Cobra",     ld50: 5.4   },
] as const;

/** Append 2-digit hex opacity suffix to a hex color string */
function withOpacity(hex: string, opacity: number): string {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, "0");
}

function getSnakeLD50(snake: Snake): number | null {
  if (!snake.venomPotency) return null;
  const val = snake.venomPotency.ld50Normalized || snake.venomPotency.ld50;
  return val > 0 ? val : null;
}

type SimEntry = {
  snake: Snake;
  ld50: number;
  potency: number;
  yieldMg: number;
  x0: number; y0: number;
  x: number;  y: number;
};

export function VenomPotencyChart({ currentSnake, medianLD50 }: VenomPotencyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simCacheRef = useRef<{ key: string; data: SimEntry[] } | null>(null);

  const [showAllSnakes, setShowAllSnakes] = useState(false);
  const [scaleByYield, setScaleByYield] = useState(false);
  const [filterFamily, setFilterFamily] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);

  useEffect(() => {
    if (!showAllSnakes) {
      setFilterFamily(null);
      setFilterRegion(null);
    }
  }, [showAllSnakes]);

  const currentLD50 = useMemo(() => getSnakeLD50(currentSnake), [currentSnake]);
  const getPotency = useCallback((ld50: number) => 100 / ld50, []);

  const allVenomousSnakes = useMemo(() =>
    getAllSnakes().filter(s =>
      !EXCLUDED_CLASSIFICATIONS.has(s.venomClassification) &&
      getSnakeLD50(s) !== null &&
      s.id !== currentSnake.id
    ), [currentSnake.id]);

  // Auto-fit x-axis to cover all data; snap to next decade, minimum 100
  const xMax = useMemo(() => {
    if (currentLD50 === null) return 100;
    const allLD50s = allVenomousSnakes.map(s => getSnakeLD50(s) ?? 0).filter(v => v > 0);
    const maxData = Math.max(currentLD50, ...allLD50s);
    const snap = Math.pow(10, Math.ceil(Math.log10(maxData)));
    return Math.min(500, Math.max(100, snap));
  }, [currentLD50, allVenomousSnakes]);

  const uniqueFamilies = useMemo(() =>
    [...new Set(allVenomousSnakes.map(s => s.family))].sort()
  , [allVenomousSnakes]);

  const uniqueRegions = useMemo(() =>
    [...new Set(allVenomousSnakes.flatMap(s => s.continents))].sort()
  , [allVenomousSnakes]);

  const potencyPercentile = useMemo(() => {
    if (currentLD50 === null) return null;
    const count = allVenomousSnakes.filter(s => getSnakeLD50(s)! > currentLD50).length;
    return Math.round((count / allVenomousSnakes.length) * 100);
  }, [currentLD50, allVenomousSnakes]);

  const defaultYMax = useMemo(() => {
    if (currentLD50 === null) return 500;
    const p = getPotency(currentLD50);
    return Math.min(5000, Math.max(200, Math.ceil(p * 1.3)));
  }, [currentLD50, getPotency]);

  const [yMax, setYMax] = useState(defaultYMax);
  useEffect(() => { setYMax(defaultYMax); }, [defaultYMax]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setYMax(prev => Math.round(Math.min(5000, Math.max(100, e.deltaY > 0 ? prev * 1.1 : prev * 0.9))));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const ladderTicks = useMemo(() => {
    const step = Math.ceil(yMax / 5 / 10) * 10;
    const ticks = [0];
    for (let v = step; v <= yMax; v += step) ticks.push(v);
    return ticks;
  }, [yMax]);

  const formatTick = (val: number) => {
    if (val === 0) return "0×";
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k×`;
    return `${val}×`;
  };

  useEffect(() => {
    if (!svgRef.current || currentLD50 === null) return;

    const width = 760;
    const height = 520;
    const margin = { top: 40, right: 100, bottom: 100, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = 360;

    select(svgRef.current).selectAll("*").remove();

    const svg = select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = scaleLog().domain([0.01, xMax]).range([0, chartWidth]);
    const yScale = scaleLinear().domain([0, yMax]).range([chartHeight, 0]);
    const getCurveY = (val: number) => yScale(Math.max(0, Math.min(yMax, getPotency(val))));

    const maxLog = Math.log10(xMax);
    const curvePoints: number[] = [];
    for (let i = -2; i <= maxLog; i += 0.005) curvePoints.push(Math.pow(10, i));

    // Defs
    const defs = svg.append("defs");
    defs.append("clipPath").attr("id", "chart-clip")
      .append("rect").attr("width", chartWidth).attr("height", chartHeight);

    const areaGrad = defs.append("linearGradient").attr("id", "area-gradient")
      .attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");
    areaGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.12);
    areaGrad.append("stop").attr("offset", "50%").attr("stop-color", "#eab308").attr("stop-opacity", 0.06);
    areaGrad.append("stop").attr("offset", "100%").attr("stop-color", "#22c55e").attr("stop-opacity", 0.03);

    const lineGrad = defs.append("linearGradient").attr("id", "line-gradient")
      .attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");
    lineGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.7);
    lineGrad.append("stop").attr("offset", "50%").attr("stop-color", "#eab308").attr("stop-opacity", 0.5);
    lineGrad.append("stop").attr("offset", "100%").attr("stop-color", "#22c55e").attr("stop-opacity", 0.4);

    const dotColorScale = scaleLog<string>()
      .domain([0.01, 1, 100]).range(["#ef4444", "#eab308", "#22c55e"])
      .interpolate(interpolateRgb).clamp(true);

    const radiusScale = scaleSqrt().domain([0, 600]).range([3.5, 14]);

    const vYield = currentSnake.venomYield;
    const dryMg = vYield?.dryWeight ?? (vYield?.wetVolume != null ? vYield.wetVolume * 200 : null);
    const currentYieldMg = dryMg ?? (vYield ? imputeDryYield(vYield.qualitative) : 0);

    // 1. Grid lines
    svg.selectAll(".ladder-line").data(ladderTicks).join("line")
      .attr("x1", 0).attr("x2", chartWidth)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#e7e5e4").attr("stroke-width", 1);

    svg.selectAll(".ladder-label").data(ladderTicks.filter(d => d > 0)).join("text")
      .attr("x", chartWidth + 10).attr("y", d => yScale(d) + 3)
      .attr("fill", "#78716c")
      .style("font-size", "10px").style("font-family", "ui-monospace, monospace").style("font-weight", "600")
      .text(d => formatTick(d));

    // 2. Area & curve
    const mainChartG = svg.append("g").attr("clip-path", "url(#chart-clip)");

    mainChartG.append("path").datum(curvePoints)
      .attr("d", area<number>().x(d => xScale(d)).y0(chartHeight).y1(d => getCurveY(d)).curve(curveLinear))
      .attr("fill", "url(#area-gradient)");

    mainChartG.append("path").datum(curvePoints)
      .attr("d", line<number>().x(d => xScale(d)).y(d => getCurveY(d)).curve(curveLinear))
      .attr("fill", "none").attr("stroke", "url(#line-gradient)").attr("stroke-width", 1.5);

    // 3. All-snakes comparison dots
    if (showAllSnakes) {
      const tooltip = select(containerRef.current)
        .append("div").attr("class", "potency-tooltip")
        .style("position", "absolute").style("pointer-events", "none").style("opacity", 0)
        .style("background", "#1c1917").style("color", "#fafaf9")
        .style("padding", "6px 10px").style("border-radius", "6px")
        .style("font-size", "11px").style("font-family", "ui-monospace, monospace")
        .style("line-height", "1.4").style("white-space", "nowrap")
        .style("z-index", "50").style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)");

      const visibleSnakes = allVenomousSnakes.filter(s => getSnakeLD50(s)! <= xMax * 1.1);
      const simCacheKey = `${currentSnake.id}|${scaleByYield}|${xMax}|${yMax}`;

      let allSimData: SimEntry[];
      if (simCacheRef.current?.key === simCacheKey) {
        allSimData = simCacheRef.current.data;
      } else {
        const rawData: SimEntry[] = visibleSnakes.map(s => {
          const ld50 = getSnakeLD50(s)!;
          const sv = s.venomYield;
          const dm = sv?.dryWeight ?? (sv?.wetVolume != null ? sv.wetVolume * 200 : null);
          const yieldMg = dm ?? (sv ? imputeDryYield(sv.qualitative) : 0);
          const x0 = xScale(ld50);
          const y0 = yScale(Math.max(0, Math.min(yMax, getPotency(ld50))));
          return { snake: s, ld50, potency: getPotency(ld50), yieldMg, x0, y0, x: x0, y: y0 };
        });

        const sim = forceSimulation(rawData as any)
          .force("x", forceX((d: any) => d.x0).strength(0.8))
          .force("y", forceY((d: any) => d.y0).strength(0.8))
          .force("collide", forceCollide((d: any) => (scaleByYield ? radiusScale(d.yieldMg) : 5.5) + 0.5).iterations(2))
          .stop();
        for (let i = 0; i < 120; ++i) sim.tick();

        allSimData = rawData;
        simCacheRef.current = { key: simCacheKey, data: rawData };
      }

      // Family/region filter applies to display only, not simulation
      const snakeData = allSimData.filter(d => {
        if (filterFamily && d.snake.family !== filterFamily) return false;
        if (filterRegion && !d.snake.continents.includes(filterRegion as import("@/lib/types").Continent)) return false;
        return true;
      });

      const dots = mainChartG.selectAll(".all-snake-dot")
        .data(snakeData)
        .join("circle").attr("class", "all-snake-dot")
        .attr("cx", d => d.x0).attr("cy", d => d.y0)
        .attr("r", d => scaleByYield ? radiusScale(d.yieldMg) : 5.5)
        .attr("fill", d => dotColorScale(d.ld50))
        .attr("fill-opacity", 0.7).attr("stroke", "white").attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", (_e, d) => { window.location.href = `/snakes/${d.snake.id}`; })
        .on("mouseenter", function (_e, d) {
          const r = scaleByYield ? radiusScale(d.yieldMg) + 2 : 7;
          select(this).attr("r", r).attr("fill-opacity", 1).attr("stroke-width", 1.5);
          const potStr = d.potency >= 1000 ? `${(d.potency / 1000).toFixed(1)}k×` : `${Math.round(d.potency)}×`;
          tooltip.html(
            `<strong>${d.snake.commonName}</strong><br/>` +
            `${d.ld50.toFixed(3)} mg/kg · ${potStr}` +
            (scaleByYield && d.yieldMg > 0 ? `<br/>Yield: ${d.yieldMg} mg` : "")
          ).style("opacity", 1);
        })
        .on("mousemove", function (event) {
          const rect = containerRef.current!.getBoundingClientRect();
          tooltip.style("left", `${event.clientX - rect.left + 12}px`).style("top", `${event.clientY - rect.top - 10}px`);
        })
        .on("mouseleave", function (_e, d) {
          select(this).attr("r", scaleByYield ? radiusScale(d.yieldMg) : 5.5).attr("fill-opacity", 0.7).attr("stroke-width", 1);
          tooltip.style("opacity", 0);
        });

      const updateLocalizedSpread = (mx: number | null, my: number | null) => {
        const R = 100;
        dots
          .attr("cx", (d: any) => {
            if (mx === null || my === null) return d.x0;
            const dist = Math.sqrt((d.x0 - mx) ** 2 + (d.y0 - my) ** 2);
            const w = Math.max(0, Math.min(1, 1 - dist / R));
            return d.x0 + (d.x - d.x0) * w * w * (3 - 2 * w);
          })
          .attr("cy", (d: any) => {
            if (mx === null || my === null) return d.y0;
            const dist = Math.sqrt((d.x0 - mx) ** 2 + (d.y0 - my) ** 2);
            const w = Math.max(0, Math.min(1, 1 - dist / R));
            return d.y0 + (d.y - d.y0) * w * w * (3 - 2 * w);
          });
      };

      svg.on("mousemove", (e) => updateLocalizedSpread(...pointer(e, mainChartG.node()) as [number, number]))
         .on("mouseleave", () => updateLocalizedSpread(null, null));
    }

    // 4. Median — full-height dashed line with label in top margin
    if (medianLD50 >= 0.01 && medianLD50 <= xMax) {
      const medX = xScale(medianLD50);
      svg.append("line")
        .attr("x1", medX).attr("x2", medX).attr("y1", 0).attr("y2", chartHeight)
        .attr("stroke", "#78716c").attr("stroke-width", 0.75).attr("stroke-dasharray", "3,3").attr("opacity", 0.35);
      svg.append("text").attr("x", medX).attr("y", -18)
        .attr("text-anchor", "middle").attr("fill", "#78716c")
        .style("font-size", "9px").style("font-weight", "600").style("letter-spacing", "0.05em")
        .text("MEDIAN");
      svg.append("text").attr("x", medX).attr("y", -6)
        .attr("text-anchor", "middle").attr("fill", "#78716c").attr("opacity", 0.7)
        .style("font-size", "8px").style("font-family", "ui-monospace, monospace")
        .text(`${medianLD50.toFixed(2)} mg/kg`);
    }

    // 5. Reference anchors
    const snakeXPx = xScale(currentLD50);
    const medXPx = medianLD50 >= 0.01 && medianLD50 <= xMax ? xScale(medianLD50) : -999;
    const drawnRefXs: number[] = [];

    for (const ref of REFERENCE_ANCHORS) {
      if (ref.id === currentSnake.id || ref.ld50 < 0.01 || ref.ld50 > xMax) continue;
      const refXPx = xScale(ref.ld50);
      if (Math.abs(refXPx - snakeXPx) < 22) continue;
      if (Math.abs(refXPx - medXPx) < 22) continue;
      if (drawnRefXs.some(px => Math.abs(px - refXPx) < 32)) continue;
      drawnRefXs.push(refXPx);

      svg.append("line")
        .attr("x1", refXPx).attr("x2", refXPx).attr("y1", 0).attr("y2", chartHeight)
        .attr("stroke", "#a8a29e").attr("stroke-width", 0.5).attr("stroke-dasharray", "2,4").attr("opacity", 0.5);
      svg.append("text").attr("x", refXPx).attr("y", chartHeight + 24)
        .attr("text-anchor", "middle").attr("fill", "#a8a29e")
        .style("font-size", "8px").style("font-weight", "600").style("letter-spacing", "0.03em")
        .text(ref.name);
    }

    // 6. Current snake — always-visible pill label
    const snakeY = getCurveY(currentLD50);
    const hasYieldLine = scaleByYield && currentYieldMg > 0;
    const LABEL_OFFSET = hasYieldLine ? 44 : 32;
    const labelY = Math.max(-margin.top + 10, snakeY - LABEL_OFFSET);

    mainChartG.append("line")
      .attr("x1", snakeXPx).attr("x2", snakeXPx)
      .attr("y1", snakeY - 4).attr("y2", Math.max(labelY + 18, 2))
      .attr("stroke", "#2c2c2c").attr("stroke-width", 0.5).attr("opacity", 0.2);

    mainChartG.append("circle")
      .attr("cx", snakeXPx).attr("cy", snakeY)
      .attr("r", scaleByYield ? radiusScale(currentYieldMg) : 6)
      .attr("fill", "#ef4444").attr("stroke", "#2c2c2c").attr("stroke-width", 1.5);

    const labelG = svg.append("g").attr("transform", `translate(${snakeXPx}, ${labelY})`);

    labelG.append("text").attr("x", 0).attr("y", 0)
      .attr("text-anchor", "middle").attr("fill", "#fff")
      .style("font-size", "10px").style("font-weight", "600").style("letter-spacing", "0.05em")
      .text(currentSnake.commonName.toUpperCase());

    labelG.append("text").attr("x", 0).attr("y", 13)
      .attr("text-anchor", "middle").attr("fill", "#fff").attr("opacity", 0.9)
      .style("font-size", "9px").style("font-family", "ui-monospace, monospace")
      .text(`${currentLD50.toFixed(3)} mg/kg`);

    if (hasYieldLine) {
      labelG.append("text").attr("x", 0).attr("y", 26)
        .attr("text-anchor", "middle").attr("fill", "#fff").attr("opacity", 0.75)
        .style("font-size", "9px").style("font-family", "ui-monospace, monospace")
        .text(`yield: ${currentYieldMg} mg`);
    }

    const bbox = (labelG.node() as SVGGElement).getBBox();
    labelG.insert("rect", "text")
      .attr("x", bbox.x - 8).attr("y", bbox.y - 5)
      .attr("width", bbox.width + 16).attr("height", bbox.height + 10)
      .attr("rx", 6).attr("fill", "#ef4444").attr("opacity", 0.92);

    // 7. X-Axis
    const xTicks = [0.01, 0.1, 1, 10, 100].filter(v => v <= xMax);
    if (!xTicks.includes(xMax) && xMax > 0.01) xTicks.push(xMax);

    svg.append("g").attr("transform", `translate(0, ${chartHeight})`)
      .call(
        axisBottom(xScale).tickValues(xTicks).tickSize(6).tickPadding(12)
          .tickFormat(d => {
            const v = Number(d);
            if (v >= 1) return v.toFixed(0);
            if (v >= 0.1) return v.toFixed(1);
            return v.toFixed(2);
          })
      )
      .call(g => g.select(".domain").attr("stroke", "#e7e5e4"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#e7e5e4"))
      .call(g => g.selectAll(".tick text").attr("fill", "#78716c").style("font-size", "10px").style("font-family", "ui-monospace, monospace"));

    // 8. Axis labels
    svg.append("text").attr("x", chartWidth).attr("y", chartHeight + 42)
      .attr("text-anchor", "end").attr("fill", "#78716c")
      .style("font-size", "9px").style("font-weight", "600").style("letter-spacing", "0.03em")
      .text("LD₅₀ (mg/kg, log scale) →");

    svg.append("text").attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2).attr("y", -55)
      .attr("text-anchor", "middle").attr("fill", "#78716c")
      .style("font-size", "9px").style("font-weight", "600").style("letter-spacing", "0.03em")
      .text("RELATIVE POTENCY");

    return () => {
      select(containerRef.current).selectAll(".potency-tooltip").remove();
    };
  }, [currentLD50, currentSnake, medianLD50, yMax, xMax, ladderTicks, getPotency, showAllSnakes, scaleByYield, allVenomousSnakes, filterFamily, filterRegion]);

  if (currentLD50 === null) return null;

  return (
    <div className="w-full bg-white rounded-xl p-6 border border-stone-100 shadow-sm mt-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[#2c2c2c]">Venom Potency Distribution</h3>
          {/* Info tooltip */}
          <div className="relative group">
            <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-500 text-[10px] font-bold flex items-center justify-center cursor-help select-none">
              ?
            </span>
            <div className="absolute left-0 top-5 w-72 bg-stone-800 text-stone-100 text-[11px] rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 leading-relaxed">
              LD₅₀ (Median Lethal Dose) measures the amount of venom required to kill 50% of a test population.
              <strong className="text-white"> Lower values indicate higher potency.</strong> The scale is logarithmic
              to capture the vast difference between neurotoxic elapids and mildly venomous colubrids.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAllSnakes(prev => !prev)}
            className={`text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              showAllSnakes
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-500 border-stone-300 hover:border-stone-400 hover:text-stone-700"
            }`}
          >
            {showAllSnakes ? `All Species (${allVenomousSnakes.length})` : "Compare All"}
          </button>
          {showAllSnakes && (
            <button
              onClick={() => setScaleByYield(prev => !prev)}
              className={`text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
                scaleByYield
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-stone-500 border-stone-300 hover:border-stone-400 hover:text-stone-700"
              }`}
            >
              Scale by Yield
            </button>
          )}
        </div>
      </div>

      {/* Family + Region filter tags */}
      {showAllSnakes && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-stone-400 tracking-wide uppercase w-12 shrink-0">Family</span>
            {uniqueFamilies.map(family => {
              const isActive = filterFamily === family;
              const color = familyColor(family);
              return (
                <button
                  key={family}
                  onClick={() => setFilterFamily(isActive ? null : family)}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all"
                  style={{
                    backgroundColor: isActive ? color : withOpacity(color, 0.13),
                    color: isActive ? "#fff" : color,
                    borderColor: isActive ? color : "transparent",
                  }}
                >
                  {family}
                </button>
              );
            })}
            {filterFamily && (
              <button onClick={() => setFilterFamily(null)} className="text-[10px] text-stone-400 hover:text-stone-600 ml-1 transition-colors">
                ✕ clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-stone-400 tracking-wide uppercase w-12 shrink-0">Region</span>
            {uniqueRegions.map(region => {
              const isActive = filterRegion === region;
              return (
                <button
                  key={region}
                  onClick={() => setFilterRegion(isActive ? null : region)}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
                    isActive
                      ? "bg-stone-700 text-white border-stone-700"
                      : "bg-stone-100 text-stone-500 border-transparent hover:bg-stone-200 hover:text-stone-700"
                  }`}
                >
                  {region}
                </button>
              );
            })}
            {filterRegion && (
              <button onClick={() => setFilterRegion(null)} className="text-[10px] text-stone-400 hover:text-stone-600 ml-1 transition-colors">
                ✕ clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Yield size legend */}
      {showAllSnakes && scaleByYield && (
        <div className="flex items-center gap-5 mb-3 px-1">
          <span className="text-[10px] font-semibold text-stone-400 tracking-wide uppercase">Dot size = venom yield</span>
          {([{ mg: 50, r: 6.5 }, { mg: 200, r: 9.5 }, { mg: 500, r: 13 }] as const).map(({ mg, r }) => (
            <span key={mg} className="flex items-center gap-1.5">
              <svg width={r * 2 + 2} height={r * 2 + 2} style={{ flexShrink: 0 }}>
                <circle cx={r + 1} cy={r + 1} r={r} fill="#a8a29e" fillOpacity={0.6} stroke="white" strokeWidth={1} />
              </svg>
              <span className="text-[10px] font-mono text-stone-400">{mg} mg</span>
            </span>
          ))}
        </div>
      )}

      {/* Chart + Y-zoom slider */}
      <div className="flex gap-4 items-stretch mt-1">
        <div ref={containerRef} className="relative overflow-visible flex-1 min-w-0">
          <svg ref={svgRef} className="w-full h-auto overflow-visible" />
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0 py-2">
          <span className="text-[10px] font-semibold text-stone-500 tracking-wide">Zoom</span>
          <div className="relative h-64 w-6 flex items-center justify-center">
            <input
              type="range" min={100} max={5000} step={10} value={yMax}
              onChange={e => setYMax(Number(e.target.value))}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-4 -rotate-90 rounded-full appearance-none bg-stone-200 accent-red-400 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>
          <span className="text-[10px] font-mono font-medium text-stone-500">{formatTick(yMax)}</span>
        </div>
      </div>

      {/* Percentile stat — prominent standalone line */}
      {potencyPercentile !== null && (
        <p className="mt-3 text-[12px] text-stone-500 leading-relaxed">
          <strong className="text-stone-700">{currentSnake.commonName}</strong> is more potent than{" "}
          <strong className="text-red-500">{potencyPercentile}%</strong> of venomous species in this database.
        </p>
      )}
    </div>
  );
}
