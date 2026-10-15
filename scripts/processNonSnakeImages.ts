#!/usr/bin/env bun
/**
 * Source and save non-snake thumbnails the same way as snakes:
 * Wikimedia Commons + iNaturalist + GBIF, then download best candidate and resize.
 * Writes to public/images/non-snakes/<id>/thumbnail.jpg and updates data/non-snakes.json.
 * Run from the repo root: bun run scripts/processNonSnakeImages.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { promises as fs } from "fs";
import {
  searchSnakeImagesAllSources,
  searchWikimediaCommons,
  searchINaturalist,
  searchGBIF,
  downloadBestCandidate,
  delay,
} from "./sourceSnakeImages";
import { resizeImage } from "./imageProcessing";

const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 225;
const SKIP_EXISTING = true;
const DELAY_BETWEEN_SPECIES_MS = 2500;

interface NonSnakeEntry {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  category: string;
  emoji: string;
  venomPotency: { ld50Normalized: number };
  venomTypes?: string[];
  description: string;
  continent: string;
  images?: { thumbnail: string };
}

const dataPath = join(__dirname, "../data/non-snakes.json");
const imagesBase = join(__dirname, "../public/images/non-snakes");

async function hasExistingThumbnail(id: string): Promise<boolean> {
  const thumbPath = join(imagesBase, id, "thumbnail.jpg");
  try {
    await fs.access(thumbPath);
    return true;
  } catch {
    return false;
  }
}

async function processNonSnake(entry: NonSnakeEntry): Promise<boolean> {
  if (SKIP_EXISTING && (await hasExistingThumbnail(entry.id))) {
    console.log(`⊘ Already have thumbnail for ${entry.id}, skipping.`);
    return false;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Processing: ${entry.commonName} (${entry.scientificName})`);
  console.log(`${"=".repeat(50)}`);

  const sourceResults = await searchSnakeImagesAllSources(entry.scientificName);
  let candidates = sourceResults.combined;

  if (candidates.length === 0) {
    console.error(`✗ No image candidates found for ${entry.commonName}`);
    return false;
  }

  let downloadResult = await downloadBestCandidate(candidates, entry.id, 1);

  if (downloadResult && "tryAlternateSource" in downloadResult) {
    console.log(`  Rate limited on first source, trying others...`);
    const [wiki, iNat, gbif] = await Promise.all([
      searchWikimediaCommons(entry.scientificName),
      searchINaturalist(entry.scientificName),
      searchGBIF(entry.scientificName),
    ]);
    const altCandidates = [...iNat, ...gbif, ...wiki].sort((a, b) => b.score - a.score);
    if (altCandidates.length > 0) {
      downloadResult = await downloadBestCandidate(altCandidates, entry.id, 1);
    } else {
      downloadResult = null;
    }
  }

  if (!downloadResult || "tryAlternateSource" in downloadResult) {
    console.error(`✗ Failed to download image for ${entry.commonName}`);
    return false;
  }

  const outDir = join(imagesBase, entry.id);
  await fs.mkdir(outDir, { recursive: true });
  const thumbPath = join(outDir, "thumbnail.jpg");

  try {
    await resizeImage(
      downloadResult.imagePath,
      thumbPath,
      THUMB_WIDTH,
      THUMB_HEIGHT,
      "cover"
    );
    console.log(`  ✓ Saved thumbnail for ${entry.id}`);
    return true;
  } catch (e) {
    console.error(`  ✗ Resize failed for ${entry.id}:`, e);
    return false;
  }
}

async function main() {
  const raw = readFileSync(dataPath, "utf-8");
  const data: NonSnakeEntry[] = JSON.parse(raw);
  let updated = 0;
  const updatedData = [...data];

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const ok = await processNonSnake(entry);
    if (ok) {
      updatedData[i] = {
        ...entry,
        images: { thumbnail: `/images/non-snakes/${entry.id}/thumbnail.jpg` },
      };
      updated++;
    }
    if (i < data.length - 1) {
      await delay(DELAY_BETWEEN_SPECIES_MS);
    }
  }

  if (updated > 0) {
    writeFileSync(dataPath, JSON.stringify(updatedData, null, 2), "utf-8");
    console.log(`\nDone. Updated ${updated} entries; JSON written to data/non-snakes.json`);
  } else {
    console.log("\nDone. No new images (all skipped or no candidates).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
