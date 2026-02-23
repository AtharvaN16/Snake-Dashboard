"use client";

import { useState, useEffect, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import type { Distribution } from "@/lib/types";
import type { FeatureCollection, Geometry } from "geojson";

const WORLD_TOPOLOGY_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const BASE_FILL = "#E5E5E5";
const BASE_STROKE = "#CCCCCC";
const RANGE_FILL = "rgba(220, 38, 38, 0.28)";
const RANGE_STROKE = "rgba(185, 28, 28, 0.85)";
const RANGE_BLUR_FILL = "rgba(220, 38, 38, 0.3)";

export interface DistributionMapProps {
  distribution: Distribution;
  snakeId: string;
  className?: string;
  width?: number;
  height?: number;
}

// --- Geometry Utilities ---
function geometryToFeatureCollection(geometry: NonNullable<Distribution["geometry"]>): FeatureCollection {
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry }] };
}

function signedRingArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function normalizeRing(ring: number[][], clockwise: boolean): number[][] {
  if (ring.length < 4) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1] ? ring.slice() : [...ring, first];
  const isClockwise = signedRingArea(closed) < 0;
  if (isClockwise === clockwise) return closed;
  return closed.slice().reverse();
}

function normalizeGeometryWinding(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates as number[][][];
    return { ...geometry, coordinates: [normalizeRing(outer, true), ...holes.map((hole) => normalizeRing(hole, false))] };
  }
  if (geometry.type === "MultiPolygon") {
    return { ...geometry, coordinates: geometry.coordinates.map(([outer, ...holes]) => [normalizeRing(outer, true), ...holes.map((hole) => normalizeRing(hole, false))]) };
  }
  return geometry;
}

function normalizeFeatureCollectionWinding(fc: FeatureCollection): FeatureCollection {
  return { ...fc, features: fc.features.map((f) => f.geometry ? { ...f, geometry: normalizeGeometryWinding(f.geometry as Geometry) } : f) };
}

function getBboxFromFeatureCollection(fc: FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const consumeCoords = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      const [lng, lat] = coords as number[];
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      return;
    }
    if (Array.isArray(coords)) for (const child of coords) consumeCoords(child);
  };
  for (const f of fc.features) {
    if (f.geometry && "coordinates" in f.geometry) {
      consumeCoords((f.geometry as { coordinates: unknown }).coordinates);
    }
  }
  return minLng === Infinity ? null : [minLng, minLat, maxLng, maxLat];
}

export function DistributionMap({ distribution, snakeId, className = "", width = 460, height = 280 }: DistributionMapProps) {
  const [rangeGeoJson, setRangeGeoJson] = useState<FeatureCollection | null>(() => 
    distribution.geometry ? normalizeFeatureCollectionWinding(geometryToFeatureCollection(distribution.geometry)) : null
  );
  const [loading, setLoading] = useState(!distribution.geometry);

  // --- Animation State ---
  // Using React state for the values that react-simple-maps consumes
  const [projection, setProjection] = useState({ center: [0, 20] as [number, number], scale: 140 });

  // Using Motion Values for the "fly-to" physics
  const mvLng = useMotionValue(0);
  const mvLat = useMotionValue(20);
  const mvScale = useMotionValue(140);

  // Using Spring for smooth geographic transitions
  const springConfig = { stiffness: 45, damping: 20, mass: 1, restDelta: 0.01 };
  const sLng = useSpring(mvLng, springConfig);
  const sLat = useSpring(mvLat, springConfig);
  const sScale = useSpring(mvScale, springConfig);

  const urlToFetch = useMemo(() => {
    if (distribution.geometry) return null;
    return distribution.rangeGeoJsonPath || `/geojson/ranges/${snakeId}.json`;
  }, [distribution.geometry, distribution.rangeGeoJsonPath, snakeId]);

  useEffect(() => {
    let cancelled = false;
    if (!urlToFetch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(urlToFetch)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (cancelled) return;
        const fc = data.type === "FeatureCollection" ? data : { type: "FeatureCollection", features: [data] };
        setRangeGeoJson(normalizeFeatureCollectionWinding(fc));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [urlToFetch]);

  // Update Motion Values when target changes
  const targetConfig = useMemo(() => {
    if (rangeGeoJson) {
      const bbox = getBboxFromFeatureCollection(rangeGeoJson);
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox;
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        const span = Math.max(maxLng - minLng, (maxLat - minLat) * (width / height), 6);
        const scale = Math.min(550, (360 / (span * 2.8)) * 100);
        return { center: [centerLng, centerLat] as [number, number], scale };
      }
    }
    return { center: [0, 20] as [number, number], scale: 140 };
  }, [rangeGeoJson, width, height]);

  useEffect(() => {
    mvLng.set(targetConfig.center[0]);
    mvLat.set(targetConfig.center[1]);
    mvScale.set(targetConfig.scale);
  }, [targetConfig, mvLng, mvLat, mvScale]);

  // Sync springs back to React state to trigger re-renders of the Map
  useEffect(() => {
    const unsubLng = sLng.on("change", (v) => setProjection(p => ({ ...p, center: [v, p.center[1]] })));
    const unsubLat = sLat.on("change", (v) => setProjection(p => ({ ...p, center: [p.center[0], v] })));
    const unsubScale = sScale.on("change", (v) => setProjection(p => ({ ...p, scale: v })));
    return () => {
      unsubLng();
      unsubLat();
      unsubScale();
    };
  }, [sLng, sLat, sScale]);

  const blurFilterId = useMemo(() => `range-blur-${snakeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`, [snakeId]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-[1px] z-10 pointer-events-none"
          >
            <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
              Searching...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: projection.scale,
            center: projection.center,
          }}
          width={width}
          height={height}
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <filter id={blurFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Base World Map */}
          <Geographies geography={WORLD_TOPOLOGY_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={BASE_FILL}
                  stroke={BASE_STROKE}
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Species Range Layer */}
          <AnimatePresence mode="wait">
            {rangeGeoJson && (
              <motion.g
                key={snakeId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
              >
                {/* Pulsing Underlay */}
                <motion.g
                  animate={{ opacity: [0.35, 0.65, 0.35] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Geographies geography={rangeGeoJson}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={`${geo.rsmKey}-underlay`}
                          geography={geo}
                          fill={RANGE_BLUR_FILL}
                          stroke="none"
                          filter={`url(#${blurFilterId})`}
                          style={{ default: { outline: "none" } }}
                        />
                      ))
                    }
                  </Geographies>
                </motion.g>

                {/* Main Range */}
                <Geographies geography={rangeGeoJson}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={RANGE_FILL}
                        stroke={RANGE_STROKE}
                        strokeWidth={1.2}
                        strokeLinejoin="round"
                        style={{ default: { outline: "none" } }}
                      />
                    ))
                  }
                </Geographies>
              </motion.g>
            )}
          </AnimatePresence>
        </ComposableMap>
      </div>

      {!loading && !rangeGeoJson && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest text-stone-300 font-bold bg-white/50 px-2 py-1 rounded backdrop-blur-sm">
            Habitat Not Mapped
          </span>
        </div>
      )}
    </div>
  );
}
