/**
 * Fetch range GeoJSONs for all snakes from iNaturalist Open Range Map Dataset.
 *
 * Source APIs:
 * - Taxon search: https://api.inaturalist.org/v1/taxa
 * - Range GeoJSON: https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geojsons/latest/<taxon_id>.geojson
 *
 * Output:
 * - public/geojson/ranges/<snake-id>.json
 * - data/rangeMaps/inatTaxonMatches.json
 *
 * Usage:
 *   npx tsx scripts/fetchINatRangeGeojsons.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

type Snake = {
  id: string;
  scientificName: string;
  commonName: string;
};

type InatTaxon = {
  id: number;
  name: string;
  iconic_taxon_name?: string;
  rank?: string;
  matched_term?: string;
};

type InatTaxaResponse = {
  results?: InatTaxon[];
};

const SNAKES_PATH = resolve(process.cwd(), "data/snakes/index.json");
const OUT_DIR = resolve(process.cwd(), "public/geojson/ranges");
const MATCHES_OUT = resolve(process.cwd(), "data/rangeMaps/inatTaxonMatches.json");
const GEOJSON_BASE =
  "https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geojsons/latest";

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

async function searchTaxa(query: string): Promise<InatTaxon[]> {
  const url = new URL("https://api.inaturalist.org/v1/taxa");
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", "30");
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "snake-dashboard-range-fetcher/1.0" },
    });
    if (res.status === 429) {
      await sleep(600 * (attempt + 1));
      continue;
    }
    if (!res.ok) return [];
    const json = (await res.json()) as InatTaxaResponse;
    return json.results ?? [];
  }
  return [];
}

function pickBestTaxon(sn: Snake, results: InatTaxon[]): InatTaxon | null {
  const targetSci = normalize(sn.scientificName);
  const binomial = normalize(sn.scientificName).split(" ").slice(0, 2).join(" ");

  // Strongest: exact scientific name + reptile species.
  for (const t of results) {
    if (
      normalize(t.name) === targetSci &&
      t.rank === "species" &&
      t.iconic_taxon_name === "Reptilia"
    ) {
      return t;
    }
  }

  // Next: exact scientific name regardless of iconic bucket.
  for (const t of results) {
    if (normalize(t.name) === targetSci && t.rank === "species") return t;
  }

  // Next: exact binomial for trinomial names.
  for (const t of results) {
    if (
      normalize(t.name) === binomial &&
      t.rank === "species" &&
      t.iconic_taxon_name === "Reptilia"
    ) {
      return t;
    }
  }

  // Accept reptile subspecies only if exact scientific name matches.
  for (const t of results) {
    if (
      normalize(t.name) === targetSci &&
      t.rank === "subspecies" &&
      t.iconic_taxon_name === "Reptilia"
    ) {
      return t;
    }
  }

  // Finally: first reptile species.
  for (const t of results) {
    if (t.rank === "species" && t.iconic_taxon_name === "Reptilia") return t;
  }

  return null;
}

async function fetchRangeGeoJson(taxonId: number): Promise<string | null> {
  const url = `${GEOJSON_BASE}/${taxonId}.geojson`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "snake-dashboard-range-fetcher/1.0" },
    });
    if (res.status === 429) {
      await sleep(700 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    return await res.text();
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const raw = JSON.parse(readFileSync(SNAKES_PATH, "utf-8")) as { snakes: Snake[] };
  const snakes = raw.snakes;

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(resolve(process.cwd(), "data/rangeMaps"), { recursive: true });

  const matches: Record<
    string,
    { scientificName: string; taxonId?: number; taxonName?: string; status: "matched" | "missing" | "no-geojson" }
  > = {};

  let written = 0;
  let missing = 0;
  let noGeojson = 0;

  for (const snake of snakes) {
    // 1) Search by scientific name
    let results = await searchTaxa(snake.scientificName);
    let best = pickBestTaxon(snake, results);

    // 1b) Fallback by binomial if scientific name includes subspecies.
    if (!best) {
      const binomial = snake.scientificName.split(" ").slice(0, 2).join(" ");
      if (binomial && binomial !== snake.scientificName) {
        results = await searchTaxa(binomial);
        best = pickBestTaxon({ ...snake, scientificName: binomial }, results);
      }
    }

    // 2) Fallback search by common name
    if (!best && snake.commonName) {
      results = await searchTaxa(`${snake.commonName} snake`);
      best = pickBestTaxon(snake, results);
    }

    if (!best) {
      matches[snake.id] = { scientificName: snake.scientificName, status: "missing" };
      missing++;
      await sleep(120);
      continue;
    }

    const geojson = await fetchRangeGeoJson(best.id);
    if (!geojson) {
      matches[snake.id] = {
        scientificName: snake.scientificName,
        taxonId: best.id,
        taxonName: best.name,
        status: "no-geojson",
      };
      noGeojson++;
      await sleep(120);
      continue;
    }

    const outPath = join(OUT_DIR, `${snake.id}.json`);
    writeFileSync(outPath, geojson, "utf-8");
    matches[snake.id] = {
      scientificName: snake.scientificName,
      taxonId: best.id,
      taxonName: best.name,
      status: "matched",
    };
    written++;

    await sleep(120);
  }

  writeFileSync(MATCHES_OUT, JSON.stringify(matches, null, 2) + "\n", "utf-8");

  console.log(`Wrote range files: ${written}/${snakes.length}`);
  console.log(`Missing taxa: ${missing}`);
  console.log(`Matched taxon but no GeoJSON: ${noGeojson}`);
  console.log(`Match report: ${MATCHES_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

