"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import * as d3 from "d3";
import { Snake } from "@/lib/types";
import { getAllSnakes } from "@/lib/snakeData";
import { imputeDryYield } from "@/lib/dangerScore";

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

  const [showAllSnakes, setShowAllSnakes] = useState(false);
  const [scaleByYield, setScaleByYield] = useState(false);
  const [xMax, setXMax] = useState(100);

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

  // Pinch-to-zoom only (wheel with ctrlKey); scroll over graph does not zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
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
      .domain([0.01, xMax])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([chartHeight, 0]);

    const getCurveY = (val: number) => {
      const potency = getPotency(val);
      return yScale(Math.max(0, Math.min(yMax, potency)));
    };

    const maxLog = Math.log10(xMax);
    const curvePoints: number[] = [];
    for (let i = -2; i <= maxLog; i += 0.005) {
      curvePoints.push(Math.pow(10, i));
    }

    // --- Gradient & ClipPath definitions ---
    const defs = svg.append("defs");

    // Clip path for the chart area
    defs.append("clipPath")
      .attr("id", "chart-clip")
      .append("rect")
      .attr("width", chartWidth)
      .attr("height", chartHeight);

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

    // 2. Area & Curve with gradient inside clipped group
    const mainChartG = svg.append("g").attr("clip-path", "url(#chart-clip)");

    const area = d3.area<number>()
      .x(d => xScale(d))
      .y0(chartHeight)
      .y1(d => getCurveY(d))
      .curve(d3.curveLinear);

    mainChartG.append("path")
      .datum(curvePoints)
      .attr("d", area)
      .attr("fill", "url(#area-gradient)");

    const line = d3.line<number>()
      .x(d => xScale(d))
      .y(d => getCurveY(d))
      .curve(d3.curveLinear);

    mainChartG.append("path")
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

      // Filter only snakes within current visible range for cleaner display
      const visibleSnakes = allVenomousSnakes.filter(s => getSnakeLD50(s)! <= xMax * 1.1);

      const snakeData = visibleSnakes.map(s => {
        const ld50 = getSnakeLD50(s)!;
        const vYield = s.venomYield;
        const dryMg = vYield?.dryWeight ?? (vYield?.wetVolume != null ? vYield.wetVolume * 200 : null);
        const yieldMg = dryMg ?? (vYield ? imputeDryYield(vYield.qualitative) : 0);
        const potency = getPotency(ld50);
        return { 
          snake: s, 
          ld50, 
          potency, 
          yieldMg,
          // Initial x/y for simulation
          x: xScale(ld50),
          y: yScale(Math.max(0, Math.min(yMax, potency)))
        };
      });

      const radiusScale = d3.scaleSqrt()
        .domain([0, 600])
        .range([3.5, 14]);

      // Simple force simulation to de-cluster dots (Beeswarm effect)
      const simulation = d3.forceSimulation(snakeData as any)
        .force("x", d3.forceX((d: any) => xScale(d.ld50)).strength(0.8))
        .force("y", d3.forceY((d: any) => yScale(Math.max(0, Math.min(yMax, d.potency)))).strength(0.8))
        .force("collide", d3.forceCollide((d: any) => (scaleByYield ? radiusScale(d.yieldMg) : 5.5) + 0.5).iterations(2))
        .stop();

      // Run simulation synchronously for instant results
      for (let i = 0; i < 120; ++i) simulation.tick();

      mainChartG.selectAll(".all-snake-dot")
        .data(snakeData)
        .join("circle")
        .attr("class", "all-snake-dot")
        .attr("cx", d => (d as any).x)
        .attr("cy", d => (d as any).y)
        .attr("r", d => scaleByYield ? radiusScale(d.yieldMg) : 5.5)
        .attr("fill", d => dotColorScale(d.ld50))
        .attr("fill-opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          const r = scaleByYield ? radiusScale(d.yieldMg) + 2 : 7;
          d3.select(this).attr("r", r).attr("fill-opacity", 1).attr("stroke-width", 1.5);
          const potencyStr = d.potency >= 1000
            ? `${(d.potency / 1000).toFixed(1)}k×`
            : `${Math.round(d.potency)}×`;
          tooltip
            .html(`<strong>${d.snake.commonName}</strong><br/>${d.ld50.toFixed(3)} mg/kg · ${potencyStr}${scaleByYield ? `<br/>Yield: ${d.yieldMg} mg` : ""}`)
            .style("opacity", 1);
        })
        .on("mousemove", function (event) {
          const containerRect = containerRef.current!.getBoundingClientRect();
          const x = event.clientX - containerRect.left + 12;
          const y = event.clientY - containerRect.top - 10;
          tooltip.style("left", `${x}px`).style("top", `${y}px`);
        })
        .on("mouseleave", function (event, d) {
          const r = scaleByYield ? radiusScale(d.yieldMg) : 5.5;
          d3.select(this).attr("r", r).attr("fill-opacity", 0.7).attr("stroke-width", 1);
          tooltip.style("opacity", 0);
        });
    }

    // 4. Primary data markers (snake, median) - current snake label above curve
    const points = [
      { id: "snake", val: currentLD50, label: currentSnake.commonName.toUpperCase(), color: "#2c2c2c", weight: 700 },
      { id: "median", val: medianLD50, label: "MEDIAN", color: "#78716c", weight: 600 }
    ].sort((a, b) => a.val - b.val);

    // Current snake label: fixed offset above its point so the leader line stays short
    const LABEL_OFFSET_ABOVE = 32;

    points.forEach((p, i) => {
      const x = xScale(p.val);
      const y = getCurveY(p.val);
      const isSnake = p.id === "snake";
      const leaderY = isSnake ? y - LABEL_OFFSET_ABOVE : chartHeight + 45 + (i % 2 * 35);
      const leaderY1 = isSnake ? y - 4 : y + 4;
      const leaderY2 = isSnake ? leaderY + 12 : leaderY - 12;

      // Wrap in clipping group if it's the dot, but labels might need to be outside
      const markerG = isSnake ? mainChartG : svg;

      markerG.append("line")
        .attr("class", isSnake ? "current-snake-leader" : "")
        .attr("x1", x).attr("x2", x)
        .attr("y1", leaderY1)
        .attr("y2", leaderY2)
        .attr("stroke", p.color)
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", isSnake ? "none" : "2,2")
        .attr("opacity", isSnake ? 0 : 0.3);

      const circle = svg.append("circle")
        .attr("class", isSnake ? "current-snake-dot" : "")
        .attr("cx", x).attr("cy", y)
        .attr("r", isSnake ? 6 : 4.5)
        .attr("fill", isSnake ? "#ef4444" : "white")
        .attr("stroke", p.color)
        .attr("stroke-width", 1.5);

      if (isSnake) {
        circle
          .style("cursor", "pointer")
          .on("mouseenter", () => {
            svg.select(".current-snake-leader").attr("opacity", 0.3);
            svg.select(".current-snake-label").style("opacity", "1");
          })
          .on("mouseleave", () => {
            svg.select(".current-snake-leader").attr("opacity", 0);
            svg.select(".current-snake-label").style("opacity", "0");
          });
      }

      const labelG = svg.append("g")
        .attr("class", isSnake ? "current-snake-label" : "")
        .attr("transform", `translate(${x}, ${leaderY})`)
        .style("opacity", isSnake ? "0" : "1");

      if (isSnake) {
        // Highlighted pill label (same style as taxonomy chart)
        const padX = 8;
        const padY = 5;
        const rx = 6;
        const pillColor = "#ef4444";
        labelG.append("text")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .style("font-size", "10px")
          .style("font-weight", "600")
          .style("letter-spacing", "0.05em")
          .text(p.label);
        labelG.append("text")
          .attr("x", 0)
          .attr("y", 13)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .attr("opacity", 0.9)
          .style("font-size", "9px")
          .style("font-family", "ui-monospace, monospace")
          .text(`${p.val.toFixed(3)} mg/kg`);
        const bbox = (labelG.node() as SVGGElement).getBBox();
        labelG.insert("rect", "text")
          .attr("x", bbox.x - padX)
          .attr("y", bbox.y - padY)
          .attr("width", bbox.width + padX * 2)
          .attr("height", bbox.height + padY * 2)
          .attr("rx", rx)
          .attr("fill", pillColor)
          .attr("opacity", 0.92);
      } else {
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
      }
    });

    // 5. X-Axis
    const xTicks = [0.01, 0.1, 1, 10, 100, 1000].filter(v => v <= xMax);
    if (!xTicks.includes(xMax) && xMax > 0.01) {
      xTicks.push(xMax);
    }

    const xAxis = d3.axisBottom(xScale)
      .tickValues(xTicks)
      .tickSize(6)
      .tickPadding(12)
      .tickFormat(d => {
        const val = Number(d);
        if (val >= 1) return val.toFixed(0);
        if (val >= 0.1) return val.toFixed(1);
        return val.toFixed(2);
      });

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
  }, [currentLD50, currentSnake, medianLD50, yMax, xMax, ladderTicks, getPotency, showAllSnakes, scaleByYield, allVenomousSnakes]);

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
          <span className="text-xs text-stone-400 font-medium tracking-wide">Comparative Logarithmic Scale</span>
        </div>
      </div>
      <div className="flex gap-4 items-stretch mt-1">
        <div ref={containerRef} className="relative overflow-visible flex-1 min-w-0">
          <svg ref={svgRef} className="w-full h-auto overflow-visible" />
          
          {/* Horizontal Slider (X-axis stretch) */}
          <div className="flex flex-col items-center gap-2 mt-4 px-12">
            <span className="text-[10px] font-semibold text-stone-500 tracking-wide">X-Axis Stretch (LD₅₀ Range)</span>
            <div className="relative w-full h-6 flex items-center justify-center">
              <input
                type="range"
                min={1}
                max={500}
                step={1}
                value={xMax}
                onChange={e => setXMax(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-stone-200 accent-stone-500 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stone-500 [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm"
              />
            </div>
            <span className="text-[10px] font-mono font-medium text-stone-500">{xMax} mg/kg</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 shrink-0 py-2">
          <span className="text-[10px] font-semibold text-stone-500 tracking-wide">Zoom</span>
          <div className="relative h-64 w-6 flex items-center justify-center">
            <input
              type="range"
              min={100}
              max={5000}
              step={10}
              value={yMax}
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
      <p className="text-[11px] text-stone-500 mt-4 leading-relaxed max-w-[600px]">
        LD₅₀ (Median Lethal Dose) measures the amount of venom required to kill 50% of a test population.
        <strong> Lower values indicate higher potency.</strong> The scale is logarithmic to capture the vast difference
        between neurotoxic elapids (highly potent) and mildly venomous colubrids.
      </p>
    </div>
  );
}
