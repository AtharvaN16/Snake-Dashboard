/**
 * Helper script to add commonlyMisidentifiedAs data to snakes.
 * 
 * Usage:
 *   1. Edit the MISIDENTIFICATION_MAP below with snake ID → array of confused snake IDs
 *   2. Run: bun run scripts/addMisidentificationData.ts
 *   3. The script will update data/snakes/index.json with the new data
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { SnakeDatabase } from "../lib/types";

const DATA_PATH = join(__dirname, "../data/snakes/index.json");

// Add your misidentification mappings here
// Format: "snake-id": ["confused-with-id-1", "confused-with-id-2"]
const MISIDENTIFICATION_MAP: Record<string, string[]> = {
  // North American confusions
  "copperhead": ["cottonmouth", "water-snake"],
  "cottonmouth": ["copperhead", "water-snake"],
  "coral-snake": ["milk-snake"],
  "water-snake": ["cottonmouth"],
  "timber-rattlesnake": ["copperhead"], // Non-venomous snakes mimic rattlesnakes
  
  // African confusions
  "puff-adder": ["night-adder"], // Most common confusion in Africa
  "night-adder": ["puff-adder"], // Often confused with puff adder
  "cape-cobra": ["egyptian-cobra"], // Similar cobras
  "egyptian-cobra": ["cape-cobra"],
  "black-mamba": ["green-mamba"], // Both mambas
  "green-mamba": ["black-mamba"],
  
  // Asian confusions
  "russells-viper": ["sand-boa", "african-rock-python"],
  "saw-scaled-viper": ["sand-boa"], // Sand boa mimics saw-scaled viper
  "indian-cobra": ["asian-rat-snake"], // Rat snake mimics cobra
  "monocled-cobra": ["asian-rat-snake"], // Similar confusion pattern
  "common-krait": ["asian-rat-snake", "wolf-snake"], // Krait confused with rat snakes and wolf snakes (wolf-snake not in DB yet)
  "banded-krait": ["asian-rat-snake", "wolf-snake"], // Wolf snake is common confusion for kraits
  "many-banded-krait": ["asian-rat-snake", "wolf-snake"],
  
  // Australian confusions
  "eastern-brown-snake": ["tiger-snake"], // Banded forms confused
  "tiger-snake": ["eastern-brown-snake"], // Patternless forms confused
  "red-bellied-black-snake": ["tiger-snake"], // Similar appearance
  "mulga-snake": ["eastern-brown-snake"], // King brown confused with brown snake
  "dugite": ["eastern-brown-snake"], // Similar brown snakes
  
  // Central/South American confusions
  "fer-de-lance": ["cantil"], // Similar pit vipers
  "bushmaster": ["fer-de-lance"], // Both large vipers
  "jararaca": ["fer-de-lance"], // Similar Bothrops species
  
  // Additional regional confusions
  "western-diamondback": ["timber-rattlesnake"], // Similar rattlesnakes
  "eastern-diamondback": ["timber-rattlesnake"],
  "mojave-rattlesnake": ["western-diamondback"],
  "prairie-rattlesnake": ["massasauga"],
  "massasauga": ["prairie-rattlesnake"],
  
  // Sea snake confusions
  "yellow-bellied-sea-snake": ["beaked-sea-snake"], // Similar sea snakes
  
  // Cobra confusions
  "king-cobra": ["indian-cobra"], // Both cobras, different sizes
  "philippine-cobra": ["monocled-cobra"], // Similar spitting cobras
  "javan-spitting-cobra": ["monocled-cobra"],
  "black-necked-spitting-cobra": ["monocled-cobra"],
  
  // Viper confusions
  "gaboon-viper": ["puff-adder"], // Both large African vipers
  "nose-horned-viper": ["asp-viper"], // European vipers
  "asp-viper": ["nose-horned-viper"],
  "common-adder": ["asp-viper"], // European adders
  "boomslang": ["boomslang-southern"], // Same genus
  "boomslang-southern": ["boomslang"],
  
  // Non-venomous that mimic venomous
  "sand-boa": ["russells-viper", "saw-scaled-viper"], // Mimics vipers
  "asian-rat-snake": ["indian-cobra", "monocled-cobra"], // Mimics cobras
  "milk-snake": ["coral-snake"], // Mimics coral snake
};

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as SnakeDatabase;
  
  let updatedCount = 0;
  let addedCount = 0;
  
  const snakes = data.snakes.map((snake) => {
    const misidentifiedIds = MISIDENTIFICATION_MAP[snake.id];
    
    if (misidentifiedIds) {
      // Verify all referenced snake IDs exist
      const validIds = misidentifiedIds.filter((id) => 
        data.snakes.some((s) => s.id === id)
      );
      
      const invalidIds = misidentifiedIds.filter((id) => 
        !data.snakes.some((s) => s.id === id)
      );
      
      if (invalidIds.length > 0) {
        console.warn(`⚠️  Warning: Snake "${snake.id}" references non-existent IDs: ${invalidIds.join(", ")}`);
      }
      
      if (validIds.length > 0) {
        const hadExisting = snake.commonlyMisidentifiedAs !== undefined;
        updatedCount++;
        if (!hadExisting) addedCount++;
        
        return {
          ...snake,
          commonlyMisidentifiedAs: validIds,
        };
      }
    }
    
    return snake;
  });
  
  const output: SnakeDatabase = {
    ...data,
    snakes,
    lastUpdated: new Date().toISOString().split("T")[0],
  };
  
  writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
  
  console.log(`✅ Updated ${updatedCount} snakes (${addedCount} new entries)`);
  console.log(`📝 Total snakes with misidentification data: ${snakes.filter(s => s.commonlyMisidentifiedAs?.length).length}`);
}

main();
