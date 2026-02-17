/**
 * Analyze which misidentifications are particularly dangerous.
 * 
 * Dangerous cases:
 * 1. Venomous → Non-venomous (VERY DANGEROUS - could lead to not seeking treatment)
 * 2. Highly Venomous → Mildly Venomous/Non-venomous (VERY DANGEROUS)
 * 3. Non-venomous → Venomous (less dangerous but still concerning)
 * 
 * Run: bun run scripts/analyzeDangerousMisidentifications.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { SnakeDatabase, Snake } from "../lib/types";

const DATA_PATH = join(__dirname, "../data/snakes/index.json");

function getVenomLevel(snake: Snake): "non-venomous" | "mildly" | "moderately" | "highly" {
  if (snake.venomClassification === "Non-venomous") return "non-venomous";
  if (snake.venomClassification === "Mildly Venomous") return "mildly";
  if (snake.venomClassification === "Moderately Venomous") return "moderately";
  return "highly";
}

function isMoreDangerous(level1: string, level2: string): boolean {
  const order = { "non-venomous": 0, "mildly": 1, "moderately": 2, "highly": 3 };
  return order[level1 as keyof typeof order] > order[level2 as keyof typeof order];
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as SnakeDatabase;
  const snakes = data.snakes;
  
  const snakeMap = new Map<string, Snake>();
  snakes.forEach(s => snakeMap.set(s.id, s));

  const dangerousCases: Array<{
    snake: Snake;
    confusedWith: Snake[];
    danger: "critical" | "high" | "moderate" | "low";
    reason: string;
  }> = [];

  snakes.forEach(snake => {
    if (!snake.commonlyMisidentifiedAs || snake.commonlyMisidentifiedAs.length === 0) return;

    const confusedSnakes = snake.commonlyMisidentifiedAs
      .map(id => snakeMap.get(id))
      .filter((s): s is Snake => s !== undefined);

    const snakeVenomLevel = getVenomLevel(snake);

    confusedSnakes.forEach(confused => {
      const confusedVenomLevel = getVenomLevel(confused);
      
      // CRITICAL: Venomous snake mistaken for non-venomous
      if (snakeVenomLevel !== "non-venomous" && confusedVenomLevel === "non-venomous") {
        dangerousCases.push({
          snake,
          confusedWith: [confused],
          danger: "critical",
          reason: `⚠️ CRITICAL: ${snake.venomClassification} "${snake.commonName}" mistaken for non-venomous "${confused.commonName}" - could lead to not seeking treatment!`
        });
      }
      // CRITICAL: Highly venomous mistaken for mildly/moderately venomous
      else if (snakeVenomLevel === "highly" && (confusedVenomLevel === "mildly" || confusedVenomLevel === "moderately")) {
        dangerousCases.push({
          snake,
          confusedWith: [confused],
          danger: "critical",
          reason: `⚠️ CRITICAL: Highly Venomous "${snake.commonName}" mistaken for ${confused.venomClassification} "${confused.commonName}" - could underestimate danger!`
        });
      }
      // HIGH: Moderately venomous mistaken for non-venomous
      else if (snakeVenomLevel === "moderately" && confusedVenomLevel === "non-venomous") {
        dangerousCases.push({
          snake,
          confusedWith: [confused],
          danger: "high",
          reason: `🔴 HIGH: ${snake.venomClassification} "${snake.commonName}" mistaken for non-venomous "${confused.commonName}"`
        });
      }
      // MODERATE: Non-venomous mistaken for venomous (leads to unnecessary killing)
      else if (snakeVenomLevel === "non-venomous" && confusedVenomLevel !== "non-venomous") {
        dangerousCases.push({
          snake,
          confusedWith: [confused],
          danger: "moderate",
          reason: `🟡 MODERATE: Non-venomous "${snake.commonName}" mistaken for ${confused.venomClassification} "${confused.commonName}" - could lead to unnecessary killing`
        });
      }
    });
  });

  // Group by snake
  const grouped = new Map<string, typeof dangerousCases>();
  dangerousCases.forEach(case_ => {
    const key = case_.snake.id;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(case_);
  });

  console.log("=".repeat(80));
  console.log("DANGEROUS MISIDENTIFICATION ANALYSIS");
  console.log("=".repeat(80));
  
  console.log(`\n📊 Total snakes with misidentification data: ${snakes.filter(s => s.commonlyMisidentifiedAs?.length).length}`);
  console.log(`⚠️  Snakes with dangerous misidentifications: ${grouped.size}`);

  // CRITICAL cases
  const critical = Array.from(grouped.values())
    .flat()
    .filter(c => c.danger === "critical");
  
  if (critical.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("🚨 CRITICAL DANGER CASES");
    console.log("=".repeat(80));
    console.log("Venomous snakes mistaken for non-venomous or less dangerous species");
    console.log("These could lead to NOT seeking medical treatment!\n");
    
    const criticalBySnake = new Map<string, typeof critical>();
    critical.forEach(c => {
      if (!criticalBySnake.has(c.snake.id)) {
        criticalBySnake.set(c.snake.id, []);
      }
      criticalBySnake.get(c.snake.id)!.push(c);
    });

    criticalBySnake.forEach((cases, snakeId) => {
      const snake = cases[0].snake;
      console.log(`\n${snake.commonName} (${snake.id})`);
      console.log(`  Venom Classification: ${snake.venomClassification}`);
      console.log(`  Danger Score: ${snake.dangerScore}/100`);
      cases.forEach(c => {
        c.confusedWith.forEach(confused => {
          console.log(`  ${c.reason}`);
        });
      });
    });
  }

  // HIGH cases
  const high = Array.from(grouped.values())
    .flat()
    .filter(c => c.danger === "high");
  
  if (high.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("🔴 HIGH DANGER CASES");
    console.log("=".repeat(80));
    console.log("Moderately venomous snakes mistaken for non-venomous\n");
    
    const highBySnake = new Map<string, typeof high>();
    high.forEach(c => {
      if (!highBySnake.has(c.snake.id)) {
        highBySnake.set(c.snake.id, []);
      }
      highBySnake.get(c.snake.id)!.push(c);
    });

    highBySnake.forEach((cases, snakeId) => {
      const snake = cases[0].snake;
      console.log(`\n${snake.commonName} (${snake.id})`);
      cases.forEach(c => {
        c.confusedWith.forEach(confused => {
          console.log(`  ${c.reason}`);
        });
      });
    });
  }

  // MODERATE cases (non-venomous mistaken for venomous)
  const moderate = Array.from(grouped.values())
    .flat()
    .filter(c => c.danger === "moderate");
  
  if (moderate.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("🟡 MODERATE CONCERN CASES");
    console.log("=".repeat(80));
    console.log("Non-venomous snakes mistaken for venomous (could lead to unnecessary killing)\n");
    
    const moderateBySnake = new Map<string, typeof moderate>();
    moderate.forEach(c => {
      if (!moderateBySnake.has(c.snake.id)) {
        moderateBySnake.set(c.snake.id, []);
      }
      moderateBySnake.get(c.snake.id)!.push(c);
    });

    moderateBySnake.forEach((cases, snakeId) => {
      const snake = cases[0].snake;
      console.log(`\n${snake.commonName} (${snake.id})`);
      cases.forEach(c => {
        c.confusedWith.forEach(confused => {
          console.log(`  ${c.reason}`);
        });
      });
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`\n🚨 Critical cases: ${critical.length}`);
  console.log(`🔴 High danger cases: ${high.length}`);
  console.log(`🟡 Moderate concern cases: ${moderate.length}`);
  console.log(`\n💡 These dangerous misidentifications are now documented in the database`);
  console.log(`   to help users understand the risks!`);
}

main();
