#!/usr/bin/env bun
/**
 * Test the complete image processing workflow on 5 snakes
 * Run from project root: bun run scripts/testPilot.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  searchSnakeImages,
  searchWikimediaCommons,
  searchINaturalist,
  downloadBestCandidate,
  saveAttribution,
  delay,
} from "./sourceSnakeImages";
import { processSnakeImage, hasExistingImages } from "./imageProcessing";
import type { Snake } from "../lib/types";

const TEST_SNAKE_IDS = [
  "inland-taipan",
  "black-mamba",
  "king-cobra",
  "gaboon-viper",
  "reticulated-python",
];

async function testSnake(snake: Snake): Promise<boolean> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${snake.commonName} (${snake.scientificName})`);
  console.log(`${"=".repeat(60)}`);

  // Check if already exists
  if (await hasExistingImages(snake.id)) {
    console.log(`✓ Images already exist for ${snake.id}`);
    return true;
  }

  try {
    // Step 1: Search for images
    console.log("\n1️⃣  Searching for images...");
    const candidates = await searchSnakeImages(snake.scientificName);
    console.log(`   Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      console.error(`   ✗ No suitable images found`);
      return false;
    }

    // Step 2: Download best candidate (try other source if rate-limited)
    console.log("\n2️⃣  Downloading best candidate...");
    let downloadResult = await downloadBestCandidate(candidates, snake.id);

    if (downloadResult && "tryAlternateSource" in downloadResult) {
      const primarySource = candidates[0]?.attribution?.source ?? "";
      if (primarySource.includes("Wikimedia")) {
        console.log(`   Wikimedia rate limited, trying iNaturalist...`);
        const iNatCandidates = await searchINaturalist(snake.scientificName);
        if (iNatCandidates.length > 0) {
          downloadResult = await downloadBestCandidate(iNatCandidates, snake.id);
        } else {
          downloadResult = null;
        }
      } else {
        console.log(`   iNaturalist rate limited, trying Wikimedia...`);
        const wikiCandidates = await searchWikimediaCommons(snake.scientificName);
        if (wikiCandidates.length > 0) {
          downloadResult = await downloadBestCandidate(wikiCandidates, snake.id);
        } else {
          downloadResult = null;
        }
      }
    }

    if (!downloadResult || "tryAlternateSource" in downloadResult) {
      console.error(`   ✗ Download failed`);
      return false;
    }
    console.log(`   ✓ Downloaded from ${downloadResult.attribution.source}`);

    // Step 3: Process image (resize and optimize)
    console.log("\n3️⃣  Processing image...");
    console.log("   - Creating primary (800x600 JPEG)...");
    console.log("   - Creating thumbnail (300x225 JPEG)...");
    
    const processedImages = await processSnakeImage(
      downloadResult.imagePath,
      snake.id
    );

    if (!processedImages) {
      console.error(`   ✗ Image processing failed`);
      return false;
    }

    // Step 4: Save attribution
    console.log("\n4️⃣  Saving attribution...");
    await saveAttribution(snake.id, downloadResult.attribution);
    console.log(`   ✓ Attribution saved`);

    console.log(`\n✅ Successfully processed ${snake.commonName}`);
    return true;
  } catch (error) {
    console.error(`\n✗ Error processing ${snake.commonName}:`, error);
    return false;
  }
}

async function main() {
  console.log("🧪 Snake Image Processing - Pilot Test");
  console.log("========================================");
  console.log(`\nTesting workflow with ${TEST_SNAKE_IDS.length} snakes\n`);

  // Load snake data
  const dataPath = join(__dirname, "../data/snakes/index.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  const allSnakes: Snake[] = data.snakes;

  // Get test snakes
  const testSnakes = TEST_SNAKE_IDS.map((id) =>
    allSnakes.find((s) => s.id === id)
  ).filter((s): s is Snake => s !== undefined);

  if (testSnakes.length !== TEST_SNAKE_IDS.length) {
    console.error("⚠️  Warning: Some test snake IDs not found in database");
  }

  let successful = 0;
  let failed = 0;

  // Process each test snake
  for (let i = 0; i < testSnakes.length; i++) {
    const snake = testSnakes[i];
    
    const success = await testSnake(snake);
    
    if (success) {
      successful++;
    } else {
      failed++;
    }

    // Delay between snakes to respect API rate limits
    if (i < testSnakes.length - 1) {
      console.log("\n⏸️  Pausing 3 seconds...");
      await delay(3000);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total tested: ${testSnakes.length}`);
  console.log(`✓ Successful: ${successful}`);
  console.log(`✗ Failed: ${failed}`);
  console.log("=".repeat(60));

  if (successful === testSnakes.length) {
    console.log("\n✅ All tests passed! Ready for full batch processing.");
    console.log("\nNext steps:");
    console.log("1. Review the generated images in public/images/snakes/");
    console.log("2. Check image quality and composition");
    console.log("3. Verify attribution information");
    console.log("4. Run full batch: bun run images:process");
    console.log("5. Or with gallery: bun run images:process --gallery");
  } else {
    console.log("\n⚠️  Some tests failed. Review errors above before proceeding.");
    console.log("\nTroubleshooting:");
    console.log("- Verify internet connection for API access");
    console.log("- Check if species has available images on Wikimedia/iNaturalist");
    console.log("- Review IMAGE_MANAGEMENT.md for detailed help");
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
