/**
 * Build per-snake accurate range overlays from authoritative polygon sources.
 *
 * Supported source formats:
 * - GeoJSON FeatureCollection
 * - ESRI Shapefile (.shp + .dbf), read directly without GDAL
 *
 * Usage:
 *   npx tsx scripts/extractAuthoritativeRanges.ts --source /abs/path/to/ranges.shp --format shp
 *   npx tsx scripts/extractAuthoritativeRanges.ts --source /abs/path/to/ranges.geojson --format geojson
 *
 * Optional:
 *   --name-field sci_name
 *   --out public/geojson/ranges
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import * as shapefile from "shapefile";

type GeometryType = "Polygon" | "MultiPolygon";

type RangeFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: { type: GeometryType; coordinates: unknown };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: RangeFeature[];
};

type SnakeRow = {
  id: string;
  scientificName: string;
};

const DEFAULT_OUT_DIR = resolve(process.cwd(), "public/geojson/ranges");
const SNAKES_INDEX = resolve(process.cwd(), "data/snakes/index.json");

const DEFAULT_NAME_FIELDS = [
  "sci_name",
  "SCINAME",
  "binomial",
  "BINOMIAL",
  "scientific_name",
  "Scientific_Name",
  "species",
  "SPECIES",
] as const;

// Map known naming differences between external datasets and this project.
const SCI_NAME_ALIASES: Record<string, string> = {
  // Example pattern:
  // "bitis gabonica": "bitis gabonica",
};

function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function getNameFromProperties(
  props: Record<string, unknown> | undefined,
  explicitNameField?: string
): string | undefined {
  if (!props) return undefined;
  const orderedFields = explicitNameField
    ? [explicitNameField, ...DEFAULT_NAME_FIELDS]
    : [...DEFAULT_NAME_FIELDS];

  for (const key of orderedFields) {
    const val = props[key];
    if (typeof val === "string" && val.trim().length > 0) return val;
  }
  return undefined;
}

function isPolygonGeometry(feature: RangeFeature): boolean {
  return feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon";
}

function loadSnakes() {
  const raw = JSON.parse(readFileSync(SNAKES_INDEX, "utf-8")) as { snakes: SnakeRow[] };
  const byName = new Map<string, SnakeRow>();
  for (const s of raw.snakes) {
    byName.set(normalizeName(s.scientificName), s);
  }
  return { rows: raw.snakes, byName };
}

async function readSourceFeatures(
  sourcePath: string,
  format: "shp" | "geojson"
): Promise<RangeFeature[]> {
  if (format === "geojson") {
    const raw = JSON.parse(readFileSync(sourcePath, "utf-8")) as FeatureCollection;
    if (raw.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
      throw new Error("GeoJSON source must be a FeatureCollection.");
    }
    return raw.features;
  }

  const features: RangeFeature[] = [];
  const shpSource = await shapefile.open(sourcePath);
  while (true) {
    const next = await shpSource.read();
    if (next.done) break;
    const value = next.value as RangeFeature;
    if (value?.type === "Feature" && value.geometry) {
      features.push(value);
    }
  }
  return features;
}

async function main() {
  const source = parseArg("--source");
  const formatArg = parseArg("--format");
  const nameField = parseArg("--name-field");
  const outDir = resolve(parseArg("--out") ?? DEFAULT_OUT_DIR);

  if (!source) {
    console.error(
      "Missing --source. Example: npx tsx scripts/extractAuthoritativeRanges.ts --source /path/to/ranges.shp --format shp"
    );
    process.exit(1);
  }

  const resolvedSource = resolve(source);
  const format =
    (formatArg as "shp" | "geojson" | undefined) ??
    (resolvedSource.toLowerCase().endsWith(".shp") ? "shp" : "geojson");

  if (format !== "shp" && format !== "geojson") {
    console.error("Unsupported --format. Use: shp | geojson");
    process.exit(1);
  }

  const { rows: snakes, byName } = loadSnakes();
  const features = await readSourceFeatures(resolvedSource, format);
  const groupedBySnakeId = new Map<string, RangeFeature[]>();

  for (const feature of features) {
    if (!isPolygonGeometry(feature)) continue;

    const rawName = getNameFromProperties(feature.properties, nameField);
    if (!rawName) continue;

    const normalized = normalizeName(rawName);
    const alias = SCI_NAME_ALIASES[normalized];
    const key = alias ?? normalized;
    const snake = byName.get(key);
    if (!snake) continue;

    if (!groupedBySnakeId.has(snake.id)) groupedBySnakeId.set(snake.id, []);
    groupedBySnakeId.get(snake.id)!.push(feature);
  }

  mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const snake of snakes) {
    const matches = groupedBySnakeId.get(snake.id);
    if (!matches || matches.length === 0) continue;

    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: matches,
    };
    const outPath = join(outDir, `${snake.id}.json`);
    writeFileSync(outPath, JSON.stringify(fc), "utf-8");
    written++;
  }

  const unmatched = snakes.length - written;
  console.log(`Source features: ${features.length}`);
  console.log(`Range files written: ${written}`);
  console.log(`Unmatched snakes: ${unmatched}`);
  if (unmatched > 0) {
    const missing = snakes
      .filter((s) => !groupedBySnakeId.has(s.id))
      .slice(0, 25)
      .map((s) => s.scientificName);
    console.log(`Sample unmatched scientific names: ${missing.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

