"use client";

import { useState, useEffect, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import type { Distribution } from "@/lib/types";
import type { FeatureCollection, Geometry } from "geojson";

const WORLD_TOPOLOGY_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const BASE_FILL = "#D8D1C4";
const BASE_STROKE = "#A89D8A";
const RANGE_FILL = "rgba(180, 62, 38, 0.4)";
const RANGE_STROKE = "rgba(132, 39, 20, 0.95)";
const RANGE_BLUR_FILL = "rgba(180, 62, 38, 0.36)";

export interface DistributionMapProps {
  distribution: Distribution;
  snakeId: string;
  className?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
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

export function DistributionMap({
  distribution,
  snakeId,
  className = "",
  width = 460,
  height = 280,
  responsive = false,
}: DistributionMapProps) {
  const [rangeGeoJson, setRangeGeoJson] = useState<FeatureCollection | null>(() => 
    distribution.geometry ? normalizeFeatureCollectionWinding(geometryToFeatureCollection(distribution.geometry)) : null
  );
  const [loading, setLoading] = useState(!distribution.geometry);

  // --- Snappy Animation State ---
  const mvLng = useMotionValue(0);
  const mvLat = useMotionValue(20);
  const mvScale = useMotionValue(140);

  // Increased stiffness and reduced damping for a much snappier feel
  const springConfig = { stiffness: 90, damping: 18, mass: 0.8, restDelta: 0.001 };
  const sLng = useSpring(mvLng, springConfig);
  const sLat = useSpring(mvLat, springConfig);
  const sScale = useSpring(mvScale, springConfig);

  const [projection, setProjection] = useState({ 
    center: [0, 20] as [number, number], 
    scale: 140 
  });

  const urlToFetch = useMemo(() => {
    if (distribution.geometry) return null;
    return distribution.rangeGeoJsonPath || `/geojson/ranges/${snakeId}.json`;
  }, [distribution.geometry, distribution.rangeGeoJsonPath, snakeId]);

  // Handle immediate flight based on region if GeoJSON isn't ready
  // This makes the map feel snappy by starting the move BEFORE data arrives
  useEffect(() => {
    if (distribution.coordinates && distribution.coordinates.length > 0) {
      const { lat, lng } = distribution.coordinates[0];
      mvLng.set(lng);
      mvLat.set(lat);
      mvScale.set(240); // Standard zoom level while loading
    }
  }, [snakeId, distribution.coordinates, mvLng, mvLat, mvScale]);

  // Sync rangeGeoJson if geometry prop is provided directly (without fetch)
  useEffect(() => {
    if (distribution.geometry) {
      const fc = normalizeFeatureCollectionWinding(geometryToFeatureCollection(distribution.geometry));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRangeGeoJson(fc);
      setLoading(false);
      
      // Immediate flight to direct geometry
      const bbox = getBboxFromFeatureCollection(fc);
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox;
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        const span = Math.max(maxLng - minLng, (maxLat - minLat) * (width / height), 6);
        const scale = Math.min(550, (360 / (span * 2.8)) * 100);
        mvLng.set(centerLng);
        mvLat.set(centerLat);
        mvScale.set(scale);
      }
    }
  }, [distribution.geometry, mvLng, mvLat, mvScale, width, height]);

  useEffect(() => {
    let cancelled = false;
    if (!urlToFetch) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(urlToFetch)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (cancelled) return;
        const fc = data.type === "FeatureCollection" ? data : { type: "FeatureCollection", features: [data] };
        const normalized = normalizeFeatureCollectionWinding(fc);
        setRangeGeoJson(normalized);
        
        // Refined flight once detailed bbox is known
        const bbox = getBboxFromFeatureCollection(normalized);
        if (bbox) {
          const [minLng, minLat, maxLng, maxLat] = bbox;
          const centerLng = (minLng + maxLng) / 2;
          const centerLat = (minLat + maxLat) / 2;
          const span = Math.max(maxLng - minLng, (maxLat - minLat) * (width / height), 6);
          const isGlobal = (maxLng - minLng) > 180 || (maxLat - minLat) > 90;
          const scale = isGlobal ? 140 : Math.min(550, (360 / (span * 2.8)) * 100);
          
          mvLng.set(centerLng);
          mvLat.set(centerLat);
          mvScale.set(scale);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [urlToFetch, snakeId, mvLng, mvLat, mvScale, width, height]);

  // Sync springs to projection state
  useEffect(() => {
    const unsubLng = sLng.on("change", (v) => setProjection(p => ({ ...p, center: [v, p.center[1]] })));
    const unsubLat = sLat.on("change", (v) => setProjection(p => ({ ...p, center: [p.center[0], v] })));
    const unsubScale = sScale.on("change", (v) => setProjection(p => ({ ...p, scale: v })));
    return () => { unsubLng(); unsubLat(); unsubScale(); };
  }, [sLng, sLat, sScale]);

  const blurFilterId = useMemo(() => `range-blur-${snakeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`, [snakeId]);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: responsive ? "100%" : width, height: responsive ? "100%" : height }}
    >
      <div className="w-full h-full overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={projection}
          width={width}
          height={height}
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <filter id={blurFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          <Geographies geography={WORLD_TOPOLOGY_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={BASE_FILL}
                  stroke={BASE_STROKE}
                  strokeWidth={0.5}
                  style={{ default: { outline: "none" } }}
                />
              ))
            }
          </Geographies>

          <AnimatePresence mode="wait">
            {rangeGeoJson && !loading && (
              <motion.g
                key={snakeId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
              >
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
