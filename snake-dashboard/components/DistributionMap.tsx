"use client";

import { useState, useEffect, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { Distribution } from "@/lib/types";
import type { Feature, FeatureCollection, Geometry } from "geojson";

const WORLD_TOPOLOGY_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const BASE_FILL = "#E5E5E5";
const BASE_STROKE = "#CCCCCC";
const RANGE_FILL = "rgba(220, 38, 38, 0.24)";
const RANGE_STROKE = "rgba(185, 28, 28, 0.75)";
const RANGE_BLUR_FILL = "rgba(220, 38, 38, 0.26)";

export interface DistributionMapProps {
  distribution: Distribution;
  snakeId: string;
  className?: string;
  width?: number;
  height?: number;
}

function geometryToFeatureCollection(
  geometry: NonNullable<Distribution["geometry"]>
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry,
      },
    ],
  };
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
  const closed =
    first[0] === last[0] && first[1] === last[1] ? ring.slice() : [...ring, first];
  const isClockwise = signedRingArea(closed) < 0;
  if (isClockwise === clockwise) return closed;
  return closed.slice().reverse();
}

function normalizeGeometryWinding(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates as number[][][];
    return {
      ...geometry,
      coordinates: [
        normalizeRing(outer, true),
        ...holes.map((hole) => normalizeRing(hole, false)),
      ],
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(([outer, ...holes]) => [
        normalizeRing(outer, true),
        ...holes.map((hole) => normalizeRing(hole, false)),
      ]),
    };
  }
  if (geometry.type === "GeometryCollection") {
    return {
      ...geometry,
      geometries: geometry.geometries.map((g) => normalizeGeometryWinding(g as Geometry)),
    };
  }
  return geometry;
}

function normalizeFeatureCollectionWinding(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((feature) => {
      if (!feature.geometry) return feature;
      return {
        ...feature,
        geometry: normalizeGeometryWinding(feature.geometry as Geometry),
      };
    }),
  };
}

function getBboxFromFeatureCollection(fc: FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  function consumePosition(pos: number[]) {
    const [lng, lat] = pos;
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  function consumeCoords(coords: unknown): void {
    if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === "number") {
      consumePosition(coords as number[]);
      return;
    }
    if (Array.isArray(coords)) for (const child of coords) consumeCoords(child);
  }
  for (const f of fc.features) {
    const g = f.geometry as Geometry | undefined;
    if (!g || !("coordinates" in g)) continue;
    consumeCoords((g as { coordinates: unknown }).coordinates);
  }
  if (minLng === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

function projectionConfigFromBbox(
  bbox: [number, number, number, number],
  width: number,
  height: number
) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const lngSpan = Math.max(maxLng - minLng, 4);
  const latSpan = Math.max(maxLat - minLat, 4);
  const span = Math.max(lngSpan, latSpan * (height / width));
  // Zoom out further so more of the region is visible.
  const paddedSpan = span * 2.4;
  const scale = Math.min(420, Math.max(80, (360 / paddedSpan) * 100));
  return { center: [centerLng, centerLat] as [number, number], scale };
}

export function DistributionMap({
  distribution,
  snakeId,
  className = "",
  width = 460,
  height = 280,
}: DistributionMapProps) {
  const [rangeGeoJson, setRangeGeoJson] = useState<FeatureCollection | null>(
    () => {
      if (distribution.geometry) {
        return normalizeFeatureCollectionWinding(
          geometryToFeatureCollection(distribution.geometry)
        );
      }
      return null;
    }
  );
  const [loading, setLoading] = useState(!distribution.geometry);

  const urlToFetch = useMemo(() => {
    if (distribution.geometry) return null;
    if (distribution.rangeGeoJsonPath) return distribution.rangeGeoJsonPath;
    return `/geojson/ranges/${snakeId}.json`;
  }, [distribution.geometry, distribution.rangeGeoJsonPath, snakeId]);

  useEffect(() => {
    if (!urlToFetch) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(urlToFetch)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: FeatureCollection | Feature) => {
        if (cancelled) return;
        if (data?.type === "FeatureCollection" && data?.features?.length) {
          setRangeGeoJson(normalizeFeatureCollectionWinding(data));
        } else if (data?.type === "Feature") {
          const f = data as Feature;
          if (f.geometry) {
            setRangeGeoJson(
              normalizeFeatureCollectionWinding({
                type: "FeatureCollection",
                features: [f],
              })
            );
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [urlToFetch]);

  const showMap = rangeGeoJson && rangeGeoJson.features.length > 0;
  const showPlaceholder = !showMap && !loading;

  const projectionConfig = useMemo(() => {
    if (rangeGeoJson) {
      const bbox = getBboxFromFeatureCollection(rangeGeoJson);
      if (bbox) return projectionConfigFromBbox(bbox, width, height);
    }
    return { center: [0, 20] as [number, number], scale: 147 };
  }, [rangeGeoJson, width, height]);
  const blurFilterId = useMemo(
    () => `range-soften-${snakeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    [snakeId]
  );

  if (showPlaceholder) {
    return (
      <div
        className={`flex items-center justify-center text-stone-500 text-xs ${className}`}
        style={{ minHeight: height, width }}
      >
        Range map unavailable
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center text-stone-400 text-xs ${className}`}
        style={{ minHeight: height, width }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div className={className}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: projectionConfig.scale,
          center: projectionConfig.center,
        }}
        width={width}
        height={height}
      >
        <defs>
          <filter id={blurFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" />
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
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
        {showMap && rangeGeoJson && (
          <g
            className="animate-range-reveal"
            style={{
              transformOrigin: "center",
              transformBox: "fill-box",
            }}
          >
            {/* Soft blurred underlay to feather the hard geometry cutoff. */}
            <Geographies geography={rangeGeoJson}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={`${geo.rsmKey}-blur`}
                    geography={geo}
                    fill={RANGE_BLUR_FILL}
                    stroke="none"
                    filter={`url(#${blurFilterId})`}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            <Geographies geography={rangeGeoJson}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={RANGE_FILL}
                    stroke={RANGE_STROKE}
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
          </g>
        )}
      </ComposableMap>
    </div>
  );
}
