"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import * as d3 from "d3";
import { Snake } from "@/lib/types";
import { getAllSnakes } from "@/lib/snakeData";

interface VenomPotencyChartProps {
  currentSnake: Snake;
  medianLD50: number;
}

const EXCLUDED_CLASSIFICATIONS = new Set(["Non-venomous", "Mildly Venomous"]);

function getSnakeLD50(snake: Snake): number | null {
  if (!snake.venomPotency) return null;
  const val = snake.venomPotency.ld50Normalized || snake.venomPotency.ld50;
  return val > 0 ? val : null;
}

export function VenomPotencyChart({ currentSnake, medianLD50 }: VenomPotencyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const BEE_LD50 = 2.8;

  const [showAllSnakes, setShowAllSnakes] = useState(false);

  const currentLD50 = useMemo(() => getSnakeLD50(currentSnake), [currentSnake]);

  const getPotency = useCallback((ld50: number) => 100 / ld50, []);

  const allVenomousSnakes = useMemo(() => {
    return getAllSnakes().filter(s =>
      !EXCLUDED_CLASSIFICATIONS.has(s.venomClassification) &&
      getSnakeLD50(s) !== null &&
      s.id !== currentSnake.id
    );
  }, [currentSnake.id]);

  const defaultYMax = useMemo(() => {
    if (currentLD50 === null) return 500;
    const potency = getPotency(currentLD50);
    return Math.min(5000, Math.max(200, Math.ceil(potency * 1.3)));
  }, [currentLD50, getPotency]);

  const [yMax, setYMax] = useState(defaultYMax);

  useEffect(() => {
    setYMax(defaultYMax);
  }, [defaultYMax]);

  // Scroll-to-zoom handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setYMax(prev => {
        const step = prev * 0.1;
        const next = e.deltaY > 0 ? prev + step : prev - step;
        return Math.round(Math.min(5000, Math.max(100, next)));
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const ladderTicks = useMemo(() => {
    const step = Math.ceil(yMax / 5 / 10) * 10;
    const ticks = [0];
    for (let v = step; v <= yMax; v += step) {
      ticks.push(v);
    }
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
    const margin = { top: 40, right: 100, bottom: 120, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = 360;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLog()
      .domain([0.01, 100])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([chartHeight, 0]);

    const getCurveY = (val: number) => {
      const potency = getPotency(val);
      return yScale(Math.max(0, Math.min(yMax, potency)));
    };

    const curvePoints: number[] = [];
    for (let i = -2; i <= 2; i += 0.005) {
      curvePoints.push(Math.pow(10, i));
    }

    // --- Gradient definitions ---
    const defs = svg.append("defs");

    // Horizontal gradient for area fill: red (left/potent) → green (right/mild)
    const areaGradient = defs.append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.12);
    areaGradient.append("stop").attr("offset", "50%").attr("stop-color", "#eab308").attr("stop-opacity", 0.06);
    areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#22c55e").attr("stop-opacity", 0.03);

    // Horizontal gradient for stroke: red → green
    const lineGradient = defs.append("linearGradient")
      .attr("id", "line-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    lineGradient.append("stop").attr("offset", "0%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.7);
    lineGradient.append("stop").attr("offset", "50%").attr("stop-color", "#eab308").attr("stop-opacity", 0.5);
    lineGradient.append("stop").attr("offset", "100%").attr("stop-color", "#22c55e").attr("stop-opacity", 0.4);

    // Color scale for dots: maps LD50 → red (potent) to green (mild)
    const dotColorScale = d3.scaleLog<string>()
      .domain([0.01, 1, 100])
      .range(["#ef4444", "#eab308", "#22c55e"])
      .interpolate(d3.interpolateRgb)
      .clamp(true);

    // 1. Horizontal grid lines with labels
    svg.selectAll(".ladder-line")
      .data(ladderTicks)
      .join("line")
      .attr("x1", 0).attr("x2", chartWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#e7e5e4")
      .attr("stroke-width", 1);

    svg.selectAll(".ladder-label")
      .data(ladderTicks.filter(d => d > 0))
      .join("text")
      .attr("x", chartWidth + 10)
      .attr("y", d => yScale(d) + 3)
      .attr("fill", "#78716c")
      .style("font-size", "10px")
      .style("font-family", "ui-monospace, monospace")
      .style("font-weight", "600")
      .text(d => formatTick(d));

    // 2. Area & Curve with gradient
    const area = d3.area<number>()
      .x(d => xScale(d))
      .y0(chartHeight)
      .y1(d => getCurveY(d))
      .curve(d3.curveLinear);

    svg.append("path")
      .datum(curvePoints)
      .attr("d", area)
      .attr("fill", "url(#area-gradient)");

    const line = d3.line<number>()
      .x(d => xScale(d))
      .y(d => getCurveY(d))
      .curve(d3.curveLinear);

    svg.append("path")
      .datum(curvePoints)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "url(#line-gradient)")
      .attr("stroke-width", 1.5);

    // 3. All-snakes dots (when toggled on)
    if (showAllSnakes) {
      const tooltip = d3.select(containerRef.current)
        .append("div")
        .attr("class", "potency-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("background", "#1c1917")
        .style("color", "#fafaf9")
        .style("padding", "6px 10px")
        .style("border-radius", "6px")
        .style("font-size", "11px")
        .style("font-family", "ui-monospace, monospace")
        .style("line-height", "1.4")
        .style("white-space", "nowrap")
        .style("z-index", "50")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)");

      const snakeData = allVenomousSnakes.map(s => {
        const ld50 = getSnakeLD50(s)!;
        return { snake: s, ld50, potency: getPotency(ld50) };
      });

      svg.selectAll(".all-snake-dot")
        .data(snakeData)
        .join("circle")
        .attr("class", "all-snake-dot")
        .attr("cx", d => xScale(d.ld50))
        .attr("cy", d => yScale(Math.max(0, Math.min(yMax, d.potency))))
        .attr("r", 5.5)
        .attr("fill", d => dotColorScale(d.ld50))
        .attr("fill-opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          d3.select(this).attr("r", 7).attr("fill-opacity", 1).attr("stroke-width", 1.5);
          const potencyStr = d.potency >= 1000
            ? `${(d.potency / 1000).toFixed(1)}k×`
            : `${Math.round(d.potency)}×`;
          tooltip
            .html(`<strong>${d.snake.commonName}</strong><br/>${d.ld50.toFixed(3)} mg/kg · ${potencyStr}`)
            .style("opacity", 1);
        })
        .on("mousemove", function (event) {
          const containerRect = containerRef.current!.getBoundingClientRect();
          const x = event.clientX - containerRect.left + 12;
          const y = event.clientY - containerRect.top - 10;
          tooltip.style("left", `${x}px`).style("top", `${y}px`);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", 5.5).attr("fill-opacity", 0.7).attr("stroke-width", 1);
          tooltip.style("opacity", 0);
        });
    }

    // 4. Primary data markers (snake, median, bee) — drawn on top
    const points = [
      { id: "snake", val: currentLD50, label: currentSnake.commonName.toUpperCase(), color: "#2c2c2c", weight: 700 },
      { id: "median", val: medianLD50, label: "MEDIAN", color: "#78716c", weight: 600 },
      { id: "bee", val: BEE_LD50, label: "HONEY BEE", color: "#ca8a04", weight: 600 }
    ].sort((a, b) => a.val - b.val);

    points.forEach((p, i) => {
      const x = xScale(p.val);
      const y = getCurveY(p.val);
      const isSnake = p.id === "snake";

      const leaderY = chartHeight + 45 + (i % 2 * 35);

      svg.append("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", y + 4)
        .attr("y2", leaderY - 12)
        .attr("stroke", p.color)
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", isSnake ? "none" : "2,2")
        .attr("opacity", 0.3);

      svg.append("circle")
        .attr("cx", x).attr("cy", y)
        .attr("r", isSnake ? 6 : 4.5)
        .attr("fill", isSnake ? "#ef4444" : "white")
        .attr("stroke", p.color)
        .attr("stroke-width", 1.5);

      const labelG = svg.append("g")
        .attr("transform", `translate(${x}, ${leaderY})`);

      labelG.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", p.color)
        .style("font-size", "10px")
        .style("font-weight", p.weight)
        .style("letter-spacing", "0.05em")
        .text(p.label);

      labelG.append("text")
        .attr("y", 13)
        .attr("text-anchor", "middle")
        .attr("fill", p.color)
        .attr("opacity", 0.6)
        .style("font-size", "9px")
        .style("font-family", "ui-monospace, monospace")
        .text(`${p.val.toFixed(3)} mg/kg`);
    });

    // 5. X-Axis
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0.01, 0.1, 1, 10, 100])
      .tickSize(6)
      .tickPadding(12)
      .tickFormat(d => d.toString());

    svg.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke", "#e7e5e4"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#e7e5e4"))
      .call(g => g.selectAll(".tick text")
        .attr("fill", "#78716c")
        .style("font-size", "10px")
        .style("font-family", "ui-monospace, monospace")
      );

    // 6. Header & axis labels
    const header = svg.append("g").attr("transform", "translate(0, -25)");
    header.append("text")
      .attr("fill", "#2c2c2c")
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("letter-spacing", "0.04em")
      .text("LETHALITY GRADIENT");

    svg.append("text")
      .attr("x", chartWidth).attr("y", chartHeight + 45)
      .attr("text-anchor", "end")
      .attr("fill", "#78716c")
      .style("font-size", "9px")
      .style("font-weight", "600")
      .style("letter-spacing", "0.03em")
      .text("LD₅₀ POTENCY (mg/kg) →");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2).attr("y", -55)
      .attr("text-anchor", "middle")
      .attr("fill", "#78716c")
      .style("font-size", "9px")
      .style("font-weight", "600")
      .style("letter-spacing", "0.03em")
      .text("RELATIVE POTENCY");

    // Cleanup tooltip on re-render
    return () => {
      d3.select(containerRef.current).selectAll(".potency-tooltip").remove();
    };
  }, [currentLD50, currentSnake, medianLD50, yMax, ladderTicks, getPotency, showAllSnakes, allVenomousSnakes]);

  if (currentLD50 === null) return null;

  return (
    <div className="w-full bg-white rounded-xl p-6 border border-stone-100 shadow-sm mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-[#2c2c2c]">Venom Potency Distribution</h3>
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
          <span className="text-xs text-stone-400 font-medium tracking-wide">Comparative Logarithmic Scale</span>
        </div>
      </div>
      <div ref={containerRef} className="relative overflow-visible cursor-ns-resize">
        <svg ref={svgRef} className="w-full h-auto overflow-visible" />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <label className="text-[11px] font-semibold text-stone-500 tracking-wide whitespace-nowrap">
          Zoom: {formatTick(yMax)}
        </label>
        <input
          type="range"
          min={100}
          max={5000}
          step={10}
          value={yMax}
          onChange={e => setYMax(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-stone-200 accent-red-400 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm"
        />
      </div>
      <p className="text-[11px] text-stone-500 mt-4 leading-relaxed max-w-[600px]">
        LD₅₀ (Median Lethal Dose) measures the amount of venom required to kill 50% of a test population.
        <strong> Lower values indicate higher potency.</strong> The scale is logarithmic to capture the vast difference
        between neurotoxic elapids (highly potent) and mildly venomous colubrids.
      </p>
    </div>
  );
}
