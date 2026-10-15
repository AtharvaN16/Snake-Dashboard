/**
 * Generate a snake-id -> Wikimedia range-map URL index using Wikidata property P181.
 *
 * Usage:
 *   npx tsx scripts/fetchWikidataRangeMaps.ts
 *
 * Output:
 *   data/rangeMaps/wikidataRangeMaps.json
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

type Snake = {
  id: string;
  scientificName: string;
};

const SNAKES_PATH = resolve(process.cwd(), "data/snakes/index.json");
const OUT_DIR = resolve(process.cwd(), "data/rangeMaps");
const OUT_PATH = join(OUT_DIR, "wikidataRangeMaps.json");

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function queryRangeMaps(names: string[]) {
  const values = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(" ");
  const sparql = `
SELECT ?taxonName ?rangeMap WHERE {
  VALUES ?taxonName { ${values} }
  ?item wdt:P225 ?taxonName .
  ?item wdt:P181 ?rangeMap .
}`;

  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", sparql);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "snake-dashboard-range-map-bot/1.0 (local build script)",
      Accept: "application/sparql-results+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Wikidata query failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    results?: { bindings?: Array<{ taxonName?: { value?: string }; rangeMap?: { value?: string } }> };
  };
  return json.results?.bindings ?? [];
}

async function main() {
  const raw = JSON.parse(readFileSync(SNAKES_PATH, "utf-8")) as { snakes: Snake[] };
  const snakes = raw.snakes;

  const byScientificName = new Map<string, Snake>();
  for (const s of snakes) byScientificName.set(s.scientificName, s);

  const result: Record<string, string> = {};

  // Keep query size reasonable.
  for (const batch of chunk(snakes.map((s) => s.scientificName), 40)) {
    const bindings = await queryRangeMaps(batch);
    for (const b of bindings) {
      const sci = b.taxonName?.value;
      const url = b.rangeMap?.value;
      if (!sci || !url) continue;
      const snake = byScientificName.get(sci);
      if (!snake) continue;
      result[snake.id] = url;
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + "\n", "utf-8");

  const matched = Object.keys(result).length;
  const total = snakes.length;
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Matched ${matched}/${total} snakes with Wikidata P181 range maps.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

