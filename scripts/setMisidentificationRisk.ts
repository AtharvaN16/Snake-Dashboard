/**
 * Sets misidentificationRisk: "high" on snakes where there is a documented,
 * high real-world chance of confusion with a snake of different venom status
 * AND the two species share the same geographic region / habitat.
 *
 * Criteria used:
 *  - Same or overlapping region/habitat
 *  - Venomous confused with non-venomous OR highly venomous confused with
 *    moderately venomous in a shared range
 *  - High or Very High human encounter rate on at least one species
 *
 * Run: bun run scripts/setMisidentificationRisk.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { SnakeDatabase } from "../lib/types";

const DATA_PATH = join(__dirname, "../data/snakes/index.json");

// Snakes confirmed as high-risk misidentification based on habitat overlap analysis:
//
// VERY HIGH RISK (same habitat + high encounter + highly venomous ↔ non-venomous):
//   indian-cobra      ↔ asian-rat-snake     (South Asia farmland/villages)
//   monocled-cobra    ↔ asian-rat-snake     (SE Asia agricultural fields)
//   fer-de-lance      ↔ cantil              (Central America rainforest)
//
// HIGH RISK (overlapping range + venomous ↔ non-venomous, documented confusion):
//   coral-snake       ↔ milk-snake          (SE USA forests/suburban — same region)
//   cottonmouth       ↔ water-snake         (SE USA swamps/wetlands — same region)
//   copperhead        ↔ water-snake         (E USA forests — same region)
//   banded-krait      ↔ asian-rat-snake     (SE Asia — confirmed same habitat)
//   many-banded-krait ↔ asian-rat-snake     (E/SE Asia — confirmed same habitat)
//   puff-adder        ↔ night-adder         (Africa — same continent, overlapping range)
//
// Also tag the non-venomous mimics so the warning appears on BOTH sides:
//   milk-snake        (mimics coral snake)
//   water-snake       (mistaken for cottonmouth)
//   asian-rat-snake   (mistaken for cobras/kraits)
const HIGH_RISK_IDS = new Set([
  // Asia — cobra / krait vs rat snake / wolf snake
  "indian-cobra",
  "monocled-cobra",
  "common-krait",      // confused with wolf snake (not in DB yet) and rat snake
  "banded-krait",
  "many-banded-krait",
  "asian-rat-snake",   // non-venomous mimic side

  // Central America
  "fer-de-lance",
  "cantil",            // moderately venomous, still risky vs fer-de-lance

  // North America
  "coral-snake",
  "milk-snake",        // non-venomous mimic side
  "cottonmouth",
  "copperhead",
  "water-snake",       // non-venomous mimic side

  // Africa
  "puff-adder",
  "night-adder",       // moderately venomous, confused with highly venomous puff adder
]);

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as SnakeDatabase;

  let count = 0;
  const snakes = data.snakes.map((snake) => {
    if (HIGH_RISK_IDS.has(snake.id)) {
      count++;
      return { ...snake, misidentificationRisk: "high" as const };
    }
    // Remove the field if it was previously set and no longer qualifies
    const { misidentificationRisk, ...rest } = snake as typeof snake & { misidentificationRisk?: string };
    return rest;
  });

  writeFileSync(
    DATA_PATH,
    JSON.stringify({ ...data, snakes, lastUpdated: new Date().toISOString().split("T")[0] }, null, 2)
  );

  console.log(`✅ Set misidentificationRisk: "high" on ${count} snakes`);
  snakes
    .filter((s) => (s as any).misidentificationRisk === "high")
    .forEach((s) => console.log(`   • ${s.commonName} (${s.id})`));
}

main();
