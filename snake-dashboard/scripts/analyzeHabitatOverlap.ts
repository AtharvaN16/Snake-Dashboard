/**
 * Analyze which of the 15 critical danger cases share habitats and have high misidentification risk.
 * 
 * Run: bun run scripts/analyzeHabitatOverlap.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { SnakeDatabase, Snake } from "../lib/types";

const DATA_PATH = join(__dirname, "../data/snakes/index.json");

interface CriticalCase {
  snake: Snake;
  confusedWith: Snake[];
  dangerScore: number;
  venomLevel: string;
}

function getVenomLevel(snake: Snake): string {
  return snake.venomClassification;
}

function habitatsOverlap(snake1: Snake, snake2: Snake): boolean {
  // Check region overlap
  const regions1 = new Set(snake1.distribution.regions.map(r => r.toLowerCase()));
  const regions2 = new Set(snake2.distribution.regions.map(r => r.toLowerCase()));
  
  // Check if any regions overlap
  for (const region of regions1) {
    if (regions2.has(region)) return true;
  }
  
  // Check continent/subregion overlap
  if (snake1.continent === snake2.continent) {
    const sub1 = new Set(snake1.subregions.map(s => s.toLowerCase()));
    const sub2 = new Set(snake2.subregions.map(s => s.toLowerCase()));
    for (const sub of sub1) {
      if (sub2.has(sub)) return true;
    }
  }
  
  return false;
}

function getHabitatDescription(snake: Snake): string {
  return snake.distribution.habitat || "Unknown";
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as SnakeDatabase;
  const snakes = data.snakes;
  
  const snakeMap = new Map<string, Snake>();
  snakes.forEach(s => snakeMap.set(s.id, s));

  // The 15 critical cases from previous analysis
  const criticalSnakes = [
    "puff-adder",
    "indian-cobra",
    "russells-viper",
    "monocled-cobra",
    "fer-de-lance",
    "saw-scaled-viper",
    "common-krait",
    "western-diamondback",
    "eastern-diamondback",
    "banded-krait",
    "many-banded-krait",
    "cottonmouth",
    "copperhead",
    "coral-snake",
  ];

  const criticalCases: CriticalCase[] = [];

  criticalSnakes.forEach(snakeId => {
    const snake = snakeMap.get(snakeId);
    if (!snake || !snake.commonlyMisidentifiedAs) return;

    const confusedSnakes = snake.commonlyMisidentifiedAs
      .map(id => snakeMap.get(id))
      .filter((s): s is Snake => {
        if (!s) return false;
        // Only include cases where venomous is mistaken for non-venomous or highly for moderately
        const snakeVenom = getVenomLevel(snake);
        const confusedVenom = getVenomLevel(s);
        
        if (snakeVenom !== "Non-venomous" && confusedVenom === "Non-venomous") return true;
        if (snakeVenom === "Highly Venomous" && (confusedVenom === "Moderately Venomous" || confusedVenom === "Mildly Venomous")) return true;
        if (snakeVenom === "Moderately Venomous" && confusedVenom === "Non-venomous") return true;
        return false;
      });

    if (confusedSnakes.length > 0) {
      criticalCases.push({
        snake,
        confusedWith: confusedSnakes,
        dangerScore: snake.dangerScore,
        venomLevel: getVenomLevel(snake),
      });
    }
  });

  console.log("=".repeat(80));
  console.log("HABITAT OVERLAP ANALYSIS - CRITICAL DANGER CASES");
  console.log("=".repeat(80));
  console.log(`\nAnalyzing ${criticalCases.length} critical cases for habitat overlap and encounter rates\n`);

  const highRiskCases: Array<{
    snake: Snake;
    confusedWith: Snake[];
    overlap: boolean;
    encounterRate: string;
    regions: string[];
    habitat: string;
    riskLevel: "VERY HIGH" | "HIGH" | "MODERATE";
  }> = [];

  criticalCases.forEach(case_ => {
    case_.confusedWith.forEach(confused => {
      const overlap = habitatsOverlap(case_.snake, confused);
      const encounterRate = case_.snake.humanEncounterChance;
      
      // Calculate risk level
      let riskLevel: "VERY HIGH" | "HIGH" | "MODERATE" = "MODERATE";
      if (overlap && (encounterRate === "High" || encounterRate === "Very High")) {
        riskLevel = case_.snake.venomClassification === "Highly Venomous" ? "VERY HIGH" : "HIGH";
      } else if (overlap || encounterRate === "High" || encounterRate === "Very High") {
        riskLevel = "HIGH";
      }

      highRiskCases.push({
        snake: case_.snake,
        confusedWith: [confused],
        overlap,
        encounterRate,
        regions: case_.snake.distribution.regions,
        habitat: getHabitatDescription(case_.snake),
        riskLevel,
      });
    });
  });

  // Sort by risk level
  const riskOrder = { "VERY HIGH": 3, "HIGH": 2, "MODERATE": 1 };
  highRiskCases.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

  // Group by risk level
  const veryHigh = highRiskCases.filter(c => c.riskLevel === "VERY HIGH");
  const high = highRiskCases.filter(c => c.riskLevel === "HIGH");
  const moderate = highRiskCases.filter(c => c.riskLevel === "MODERATE");

  if (veryHigh.length > 0) {
    console.log("=".repeat(80));
    console.log("🚨 VERY HIGH RISK CASES");
    console.log("=".repeat(80));
    console.log("Same habitat + High encounter rate + Highly Venomous\n");
    
    veryHigh.forEach(c => {
      console.log(`\n${c.snake.commonName} (${c.snake.id})`);
      console.log(`  Venom: ${c.snake.venomClassification} | Danger Score: ${c.snake.dangerScore}/100`);
      console.log(`  Encounter Rate: ${c.encounterRate}`);
      console.log(`  Regions: ${c.regions.join(", ")}`);
      console.log(`  Habitat: ${c.habitat}`);
      c.confusedWith.forEach(confused => {
        const confusedOverlap = habitatsOverlap(c.snake, confused);
        console.log(`\n  ⚠️  Mistaken for: ${confused.commonName} (${confused.id})`);
        console.log(`     Venom: ${confused.venomClassification}`);
        console.log(`     Regions: ${confused.distribution.regions.join(", ")}`);
        console.log(`     Habitat: ${getHabitatDescription(confused)}`);
        console.log(`     ${confusedOverlap ? "✅ SAME HABITAT" : "❌ Different habitat"}`);
      });
    });
  }

  if (high.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("🔴 HIGH RISK CASES");
    console.log("=".repeat(80));
    console.log("Same habitat OR High encounter rate\n");
    
    high.forEach(c => {
      if (c.riskLevel === "HIGH") {
        console.log(`\n${c.snake.commonName} (${c.snake.id})`);
        console.log(`  Venom: ${c.snake.venomClassification} | Encounter: ${c.encounterRate}`);
        c.confusedWith.forEach(confused => {
          const confusedOverlap = habitatsOverlap(c.snake, confused);
          console.log(`  ⚠️  Mistaken for: ${confused.commonName} ${confusedOverlap ? "✅ (Same habitat)" : "(Different habitat)"}`);
        });
      }
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`\n🚨 Very High Risk (same habitat + high encounter + highly venomous): ${veryHigh.length}`);
  console.log(`🔴 High Risk (same habitat OR high encounter): ${high.length}`);
  console.log(`🟡 Moderate Risk: ${moderate.length}`);
  
  console.log(`\n📊 Habitat Overlap Statistics:`);
  const withOverlap = highRiskCases.filter(c => c.overlap).length;
  console.log(`   Cases with habitat overlap: ${withOverlap}/${highRiskCases.length} (${Math.round(withOverlap/highRiskCases.length*100)}%)`);
  
  const highEncounter = highRiskCases.filter(c => 
    c.encounterRate === "High" || c.encounterRate === "Very High"
  ).length;
  console.log(`   Cases with high encounter rates: ${highEncounter}/${highRiskCases.length} (${Math.round(highEncounter/highRiskCases.length*100)}%)`);
}

main();
