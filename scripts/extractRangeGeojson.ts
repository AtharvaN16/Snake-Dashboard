/**
 * Extract per-snake range GeoJSON from an IUCN-style GeoJSON (e.g. Squamata polygons).
 * Run from project root: npx tsx scripts/extractRangeGeojson.ts <path-to-iucn-geojson>
 * Output: public/geojson/ranges/<snake-id>.json for each matched snake.
 *
 * IUCN GeoJSON is expected to be a FeatureCollection with features that have
 * properties.sci_name (or binomial) matching our snake.scientificName.
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const SNAKES_INDEX_PATH = join(process.cwd(), "data/snakes/index.json");
const OUTPUT_DIR = join(process.cwd(), "public/geojson/ranges");

interface SnakeStub {
  id: string;
  scientificName: string;
}

interface GeoJSONFeature {
  type: "Feature";
  properties?: Record<string, unknown> & { sci_name?: string; binomial?: string };
  geometry: unknown;
}

interface GeoJSONFC {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

function normalizeSciName(name: string): string {
  return name.trim().toLowerCase();
}

function main() {
  const iucnPath = process.argv[2];
  if (!iucnPath) {
    console.error("Usage: npx tsx scripts/extractRangeGeojson.ts <path-to-iucn-geojson>");
    process.exit(1);
  }

  const snakesData = JSON.parse(readFileSync(SNAKES_INDEX_PATH, "utf-8")) as { snakes: SnakeStub[] };
  const snakes = snakesData.snakes as SnakeStub[];
  const sciNameToSnake = new Map<string, SnakeStub>();
  for (const s of snakes) {
    sciNameToSnake.set(normalizeSciName(s.scientificName), s);
  }

  const geojson = JSON.parse(readFileSync(iucnPath, "utf-8")) as GeoJSONFC;
  if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    console.error("Expected a GeoJSON FeatureCollection");
    process.exit(1);
  }

  // Group features by scientific name (IUCN uses sci_name; older data may use binomial)
  const bySciName = new Map<string, GeoJSONFeature[]>();
  for (const f of geojson.features) {
    const name = (f.properties?.sci_name ?? f.properties?.binomial) as string | undefined;
    if (!name) continue;
    const key = normalizeSciName(name);
    if (!bySciName.has(key)) bySciName.set(key, []);
    bySciName.get(key)!.push(f);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let written = 0;
  for (const [sciKey, features] of bySciName) {
    const snake = sciNameToSnake.get(sciKey);
    if (!snake) continue;
    const outPath = join(OUTPUT_DIR, `${snake.id}.json`);
    const fc: GeoJSONFC = { type: "FeatureCollection", features };
    writeFileSync(outPath, JSON.stringify(fc), "utf-8");
    written++;
    console.log(`Wrote ${snake.id} (${snake.scientificName}) -> ${outPath}`);
  }
  console.log(`Done. Wrote ${written} range files.`);
}

main();
