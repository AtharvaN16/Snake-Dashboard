/**
 * Analyze which snakes in our database are likely candidates for misidentification data.
 * 
 * Criteria for candidates:
 * 1. Venomous snakes (especially highly venomous) - often confused with harmless species
 * 2. Snakes with high encounter rates - more misidentifications occur
 * 3. Snakes in regions with multiple similar species
 * 4. Non-venomous snakes that mimic venomous ones
 * 
 * Run: bun run scripts/analyzeMisidentificationCandidates.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { SnakeDatabase, Snake } from "../lib/types";

const DATA_PATH = join(__dirname, "../data/snakes/index.json");

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as SnakeDatabase;
  const snakes = data.snakes;

  // Categorize snakes
  const venomous = snakes.filter(s => s.venomClassification !== "Non-venomous");
  const highlyVenomous = snakes.filter(s => s.venomClassification === "Highly Venomous");
  const highEncounter = snakes.filter(s => 
    s.humanEncounterChance === "High" || s.humanEncounterChance === "Very High"
  );
  const nonVenomous = snakes.filter(s => s.venomClassification === "Non-venomous");

  // Snakes that already have misidentification data
  const withData = snakes.filter(s => s.commonlyMisidentifiedAs && s.commonlyMisidentifiedAs.length > 0);

  // Likely candidates (venomous + high encounter OR highly venomous)
  const candidates = snakes.filter(s => {
    const isVenomous = s.venomClassification !== "Non-venomous";
    const highEncounter = s.humanEncounterChance === "High" || s.humanEncounterChance === "Very High";
    const highlyVenomous = s.venomClassification === "Highly Venomous";
    
    return (isVenomous && highEncounter) || highlyVenomous;
  });

  // Non-venomous snakes that might be confused with venomous ones
  const nonVenomousCandidates = nonVenomous.filter(s => {
    const highEncounter = s.humanEncounterChance === "High" || s.humanEncounterChance === "Very High";
    return highEncounter;
  });

  console.log("=".repeat(60));
  console.log("MISIDENTIFICATION DATA ANALYSIS");
  console.log("=".repeat(60));
  console.log(`\nTotal snakes in database: ${snakes.length}`);
  console.log(`Snakes with misidentification data: ${withData.length}`);
  console.log(`Snakes without data: ${snakes.length - withData.length}`);
  
  console.log("\n" + "-".repeat(60));
  console.log("CANDIDATE ANALYSIS");
  console.log("-".repeat(60));
  
  console.log(`\n📊 Venomous snakes: ${venomous.length}`);
  console.log(`   Highly Venomous: ${highlyVenomous.length}`);
  console.log(`   High/Very High encounter rate: ${highEncounter.length}`);
  
  console.log(`\n🎯 Primary candidates (venomous + high encounter OR highly venomous): ${candidates.length}`);
  console.log(`   These are most likely to be confused with other species`);
  
  console.log(`\n🔄 Secondary candidates (non-venomous + high encounter): ${nonVenomousCandidates.length}`);
  console.log(`   These might be confused with venomous species`);
  
  console.log(`\n📝 Estimated total applicable snakes: ~${candidates.length + nonVenomousCandidates.length}`);
  console.log(`   (This is a conservative estimate - many more could have data)`);

  console.log("\n" + "-".repeat(60));
  console.log("SNAKES WITH DATA");
  console.log("-".repeat(60));
  withData.forEach(s => {
    console.log(`\n✓ ${s.commonName} (${s.id})`);
    console.log(`  Confused with: ${s.commonlyMisidentifiedAs?.map(id => {
      const other = snakes.find(s2 => s2.id === id);
      return other ? other.commonName : id;
    }).join(", ")}`);
  });

  console.log("\n" + "-".repeat(60));
  console.log("TOP CANDIDATES (without data yet)");
  console.log("-".repeat(60));
  const topCandidates = candidates
    .filter(s => !s.commonlyMisidentifiedAs || s.commonlyMisidentifiedAs.length === 0)
    .slice(0, 20);
  
  topCandidates.forEach(s => {
    console.log(`\n• ${s.commonName} (${s.id})`);
    console.log(`  ${s.venomClassification} | Encounter: ${s.humanEncounterChance} | ${s.continent}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n✅ Currently have data: ${withData.length}/${snakes.length}`);
  console.log(`🎯 Strong candidates: ~${candidates.length} snakes`);
  console.log(`🔄 Additional candidates: ~${nonVenomousCandidates.length} snakes`);
  console.log(`\n💡 Recommendation: Focus on ${candidates.length} primary candidates first`);
  console.log(`   (Highly venomous or venomous with high encounter rates)`);
}

main();
