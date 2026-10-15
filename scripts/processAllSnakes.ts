#!/usr/bin/env bun
/**
 * Batch process all snakes to source and process images
 * Run from project root: bun run scripts/processAllSnakes.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  searchSnakeImagesAllSources,
  searchWikimediaCommons,
  searchINaturalist,
  searchGBIF,
  downloadBestCandidate,
  saveAttribution,
  delay,
  downloadGalleryImages,
  saveGalleryMetadata,
  selectDiverseGalleryCandidates,
} from "./sourceSnakeImages";
import { processSnakeImage, hasExistingImages } from "./imageProcessing";
import type { Snake } from "../lib/types";

interface ProcessingReport {
  total: number;
  successful: number;
  skipped: number;
  failed: string[];
  timestamp: string;
}

const BATCH_SIZE = 5;
const SKIP_EXISTING = true;
const INCLUDE_GALLERY = process.argv.includes("--gallery") || process.argv.includes("-g");
const FAILED_ONLY = process.argv.includes("--failed-only") || process.argv.includes("-f");
// When retrying failed only, use longer delays to avoid rate limits
const DELAY_BETWEEN_REQUESTS = FAILED_ONLY ? 5000 : 2000; // 5s vs 2s
const DELAY_BETWEEN_BATCHES = FAILED_ONLY ? 15000 : 10000; // 15s vs 10s

async function processSnake(snake: Snake): Promise<boolean> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${snake.commonName} (${snake.scientificName})`);
  console.log(`${"=".repeat(60)}`);

  // Check if images already exist
  if (SKIP_EXISTING && (await hasExistingImages(snake.id))) {
    console.log(`⊘ Images already exist for ${snake.id}, skipping...`);
    return false; // Return false to indicate skipped
  }

  // Search both sources so we can build a multi-source gallery.
  const sourceResults = await searchSnakeImagesAllSources(snake.scientificName);
  // For primary image choose best candidate across all sources.
  let candidates = sourceResults.combined;

  if (candidates.length === 0) {
    console.error(`✗ No suitable images found for ${snake.commonName}`);
    return false;
  }

  // Download best candidate
  let downloadResult = await downloadBestCandidate(candidates, snake.id);

  // If Wikimedia rate-limited (429), try iNaturalist
  if (downloadResult && "tryAlternateSource" in downloadResult) {
    const primarySource = candidates[0]?.attribution?.source ?? "";
    if (primarySource.includes("Wikimedia")) {
      console.log(`  Wikimedia rate limited, trying iNaturalist and GBIF...`);
      const iNatCandidates = await searchINaturalist(snake.scientificName);
      const gbifCandidates = await searchGBIF(snake.scientificName);
      const altCandidates = [...iNatCandidates, ...gbifCandidates].sort(
        (a, b) => b.score - a.score
      );
      if (altCandidates.length > 0) {
        downloadResult = await downloadBestCandidate(altCandidates, snake.id);
      } else {
        downloadResult = null;
      }
    } else if (primarySource.includes("iNaturalist")) {
      console.log(`  iNaturalist rate limited, trying Wikimedia Commons and GBIF...`);
      const wikiCandidates = await searchWikimediaCommons(snake.scientificName);
      const gbifCandidates = await searchGBIF(snake.scientificName);
      const altCandidates = [...wikiCandidates, ...gbifCandidates].sort(
        (a, b) => b.score - a.score
      );
      if (altCandidates.length > 0) {
        downloadResult = await downloadBestCandidate(altCandidates, snake.id);
      } else {
        downloadResult = null;
      }
    } else {
      // Was GBIF (or other); try Wikimedia + iNaturalist as fallback.
      console.log(`  GBIF rate limited, trying Wikimedia Commons and iNaturalist...`);
      const wikiCandidates = await searchWikimediaCommons(snake.scientificName);
      const iNatCandidates = await searchINaturalist(snake.scientificName);
      const altCandidates = [...wikiCandidates, ...iNatCandidates].sort(
        (a, b) => b.score - a.score
      );
      if (altCandidates.length > 0) {
        downloadResult = await downloadBestCandidate(altCandidates, snake.id);
      } else {
        downloadResult = null;
      }
    }
  }

  if (!downloadResult || "tryAlternateSource" in downloadResult) {
    console.error(`✗ Failed to download image for ${snake.commonName}`);
    return false;
  }

  // Process image (remove background, resize)
  const processedImages = await processSnakeImage(
    downloadResult.imagePath,
    snake.id
  );

  if (!processedImages) {
    console.error(`✗ Failed to process image for ${snake.commonName}`);
    return false;
  }

  // Save attribution
  await saveAttribution(snake.id, downloadResult.attribution);

  // Optional: Download gallery images (2-3 additional photos) with source diversity.
  if (INCLUDE_GALLERY && sourceResults.combined.length > 1) {
    const galleryCandidates = selectDiverseGalleryCandidates(
      sourceResults.combined,
      downloadResult.attribution,
      3
    );

    if (galleryCandidates.length === 0) {
      console.log("  No additional gallery candidates available.");
    } else {
      const distinctSources = new Set(
        galleryCandidates.map((candidate) => candidate.attribution.source)
      );
      console.log(
        `  Downloading gallery images from ${distinctSources.size} source(s): ${Array.from(distinctSources).join(", ")}`
      );
      const galleryImages = await downloadGalleryImages(galleryCandidates, snake.id, 3);
      if (galleryImages.length > 0) {
        await saveGalleryMetadata(snake.id, galleryImages);
        console.log(`  ✓ Saved ${galleryImages.length} gallery images`);
      }
    }
  }

  console.log(`✓ Successfully processed ${snake.commonName}`);
  return true;
}

async function main() {
  console.log("🐍 Snake Image Batch Processor");
  console.log("================================\n");

  // Load snake data
  const dataPath = join(__dirname, "../data/snakes/index.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  let snakes: Snake[] = data.snakes;

  // Optionally process only previously failed snakes
  if (FAILED_ONLY) {
    const failedPath = join(__dirname, "../temp/failed-snakes.json");
    if (!existsSync(failedPath)) {
      console.error("No temp/failed-snakes.json found. Run a full batch first, or run without --failed-only.");
      process.exit(1);
    }
    const failedData = JSON.parse(readFileSync(failedPath, "utf-8"));
    const failedIds = new Set((failedData.snakes || []).map((s: { id: string }) => s.id));
    snakes = snakes.filter((s) => failedIds.has(s.id));
    console.log(`Retrying ${snakes.length} failed snakes only (from temp/failed-snakes.json)`);
  }

  console.log(`Loaded ${snakes.length} snakes to process`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`Skip existing: ${SKIP_EXISTING}`);
  console.log(`Include gallery: ${INCLUDE_GALLERY}`);
  console.log(`Failed only: ${FAILED_ONLY}\n`);

  const report: ProcessingReport = {
    total: snakes.length,
    successful: 0,
    skipped: 0,
    failed: [],
    timestamp: new Date().toISOString(),
  };

  // Process snakes in batches
  for (let i = 0; i < snakes.length; i += BATCH_SIZE) {
    const batch = snakes.slice(i, i + BATCH_SIZE);
    console.log(
      `\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(snakes.length / BATCH_SIZE)}`
    );
    console.log(`Snakes ${i + 1}-${Math.min(i + BATCH_SIZE, snakes.length)} of ${snakes.length}\n`);

    for (const snake of batch) {
      try {
        const success = await processSnake(snake);
        
        if (success === false && await hasExistingImages(snake.id)) {
          report.skipped++;
        } else if (success) {
          report.successful++;
        } else {
          report.failed.push(snake.id);
        }
      } catch (error) {
        console.error(`✗ Error processing ${snake.commonName}:`, error);
        report.failed.push(snake.id);
      }

      // Delay between requests to respect API rate limits
      await delay(DELAY_BETWEEN_REQUESTS);
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < snakes.length) {
      console.log(`\n⏸️  Pausing ${DELAY_BETWEEN_BATCHES / 1000} seconds between batches...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  // Generate report
  console.log("\n" + "=".repeat(60));
  console.log("📊 PROCESSING REPORT");
  console.log("=".repeat(60));
  console.log(`Total snakes: ${report.total}`);
  console.log(`✓ Successful: ${report.successful}`);
  console.log(`⊘ Skipped (already exist): ${report.skipped}`);
  console.log(`✗ Failed: ${report.failed.length}`);
  console.log("=".repeat(60));

  if (report.failed.length > 0) {
    console.log("\n❌ Failed snakes:");
    report.failed.forEach((id) => {
      const snake = snakes.find((s) => s.id === id);
      console.log(`  - ${id} (${snake?.commonName || "Unknown"})`);
    });
  }

  // Save report to file
  const reportPath = join(__dirname, "../temp/processing-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Save failed snakes list for manual processing
  if (report.failed.length > 0) {
    const failedPath = join(__dirname, "../temp/failed-snakes.json");
    const failedSnakes = snakes.filter((s) => report.failed.includes(s.id));
    writeFileSync(
      failedPath,
      JSON.stringify(
        {
          count: failedSnakes.length,
          snakes: failedSnakes.map((s) => ({
            id: s.id,
            commonName: s.commonName,
            scientificName: s.scientificName,
          })),
        },
        null,
        2
      )
    );
    console.log(`📋 Failed snakes list saved to: ${failedPath}`);
  }

  console.log("\n✅ Batch processing complete!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
