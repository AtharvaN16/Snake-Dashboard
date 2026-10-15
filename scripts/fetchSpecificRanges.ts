/**
 * Fetch range GeoJSONs for specific snakes from iNaturalist Open Range Map Dataset.
 */

import { mkdirSync, writeFileSync, readFileSync } from "fs";
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

const OUT_DIR = resolve(process.cwd(), "public/geojson/ranges");
const MATCHES_OUT = resolve(process.cwd(), "data/rangeMaps/inatTaxonMatches.json");
const GEOJSON_BASE =
  "https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geojsons/latest";

const targetSnakes: Snake[] = [
  {
    id: "blue-malayan-coral-snake",
    scientificName: "Calliophis bivirgatus",
    commonName: "Blue Malayan Coral Snake",
  },
  {
    id: "twig-snake",
    scientificName: "Thelotornis capensis",
    commonName: "Twig Snake",
  },
  {
    id: "indian-coral-snake",
    scientificName: "Calliophis melanurus",
    commonName: "Indian Coral Snake",
    extraQueries: ["Slender Coral Snake", "Calliophis melanura", "Calliophis"],
  },
  {
    id: "banded-malayan-coral-snake",
    scientificName: "Calliophis intestinalis",
    commonName: "Banded Malayan Coral Snake",
  },
];

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

  for (const t of results) {
    if (
      normalize(t.name) === targetSci &&
      t.rank === "species" &&
      t.iconic_taxon_name === "Reptilia"
    ) {
      return t;
    }
  }

  for (const t of results) {
    if (normalize(t.name) === targetSci && t.rank === "species") return t;
  }

  for (const t of results) {
    if (
      normalize(t.name) === binomial &&
      t.rank === "species" &&
      t.iconic_taxon_name === "Reptilia"
    ) {
      return t;
    }
  }

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
  mkdirSync(OUT_DIR, { recursive: true });
  
  let existingMatches = {};
  try {
    existingMatches = JSON.parse(readFileSync(MATCHES_OUT, "utf-8"));
  } catch (e) {}

  const matches = { ...existingMatches } as any;

  for (const snake of targetSnakes) {
    console.log(`Processing ${snake.commonName}...`);
    let results = await searchTaxa(snake.scientificName);
    let best = pickBestTaxon(snake, results);
    let geojson: string | null = null;

    if (best) {
      geojson = await fetchRangeGeoJson(best.id);
    }

    if (!geojson && snake.commonName) {
      results = await searchTaxa(`${snake.commonName} snake`);
      best = pickBestTaxon(snake, results);
      if (best) geojson = await fetchRangeGeoJson(best.id);
    }

    if (!geojson && (snake as any).extraQueries) {
      for (const q of (snake as any).extraQueries) {
        results = await searchTaxa(q);
        // If query is the scientific name, we might have tried it.
        // If not, try it.
        for (const t of results) {
          if (t.iconic_taxon_name === "Reptilia") {
            geojson = await fetchRangeGeoJson(t.id);
            if (geojson) {
              best = t;
              break;
            }
          }
        }
        if (geojson) break;
      }
    }

    if (!geojson) {
      console.log(`  No GeoJSON found for taxon ${best.id}`);
      matches[snake.id] = {
        scientificName: snake.scientificName,
        taxonId: best.id,
        taxonName: best.name,
        status: "no-geojson",
      };
      await sleep(500);
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
    console.log(`  Successfully wrote range to ${outPath}`);

    await sleep(500);
  }

  writeFileSync(MATCHES_OUT, JSON.stringify(matches, null, 2) + "\n", "utf-8");
  console.log("Done.");
}

main().catch(console.error);
