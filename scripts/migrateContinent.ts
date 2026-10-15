/**
 * Migration: continent → continents[], remove subregions
 *
 * Transforms every snake entry in data/snakes/index.json:
 *   - "continent": "X"  →  "continents": ["X"]
 *   - Deletes "subregions" key
 *
 * Run with: bun run scripts/migrateContinent.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(import.meta.dir, "..", "data", "snakes", "index.json");

interface RawSnake {
  continent?: string;
  continents?: string[];
  subregions?: unknown;
  [key: string]: unknown;
}

interface RawDatabase {
  lastUpdated: string;
  totalSnakes: number;
  snakes: RawSnake[];
}

const raw = readFileSync(DATA_PATH, "utf-8");
const db: RawDatabase = JSON.parse(raw);

let migrated = 0;
let alreadyDone = 0;

db.snakes = db.snakes.map((snake) => {
  const result = { ...snake };

  // Convert continent → continents
  if (typeof result.continent === "string") {
    result.continents = [result.continent];
    delete result.continent;
    migrated++;
  } else if (Array.isArray(result.continents)) {
    alreadyDone++;
  }

  // Remove subregions
  delete result.subregions;

  return result;
});

const output = JSON.stringify(db, null, 2);
writeFileSync(DATA_PATH, output + "\n", "utf-8");

console.log(`Migration complete.`);
console.log(`  Migrated continent→continents: ${migrated} snakes`);
console.log(`  Already had continents[]:      ${alreadyDone} snakes`);
console.log(`  subregions removed from all entries.`);
