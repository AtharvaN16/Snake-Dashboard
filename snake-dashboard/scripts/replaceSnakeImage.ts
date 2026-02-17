#!/usr/bin/env bun
/**
 * Manually replace a snake's image
 * Usage: bun run scripts/replaceSnakeImage.ts <snake-id> <image-path>
 */

import { promises as fs } from "fs";
import { join } from "path";
import { processSnakeImage } from "./imageProcessing";
import { saveAttribution } from "./sourceSnakeImages";
import type { ImageAttribution } from "./sourceSnakeImages";

async function replaceSnakeImage(
  snakeId: string,
  imagePath: string
): Promise<boolean> {
  console.log(`\n🔄 Replacing image for: ${snakeId}`);
  console.log(`Source: ${imagePath}\n`);

  // Validate input file exists
  try {
    await fs.access(imagePath);
  } catch {
    console.error(`✗ Error: Input file not found: ${imagePath}`);
    return false;
  }

  // Check if snake has existing images
  const outputDir = join(__dirname, "../public/images/snakes", snakeId);
  const hasExisting = await fs
    .access(outputDir)
    .then(() => true)
    .catch(() => false);

  if (hasExisting) {
    // Backup existing images
    const backupDir = join(outputDir, "backup");
    await fs.mkdir(backupDir, { recursive: true });

    const filesToBackup = ["primary.jpg", "thumbnail.jpg", "original.jpg"];
    for (const file of filesToBackup) {
      const filePath = join(outputDir, file);
      const backupPath = join(backupDir, `${Date.now()}-${file}`);

      try {
        await fs.copyFile(filePath, backupPath);
        console.log(`📦 Backed up ${file}`);
      } catch {
        // File might not exist, continue
      }
    }
  }

  // Process the new image
  console.log("\n🖼️  Processing new image...");
  const result = await processSnakeImage(imagePath, snakeId);

  if (!result) {
    console.error("\n✗ Failed to process image");
    return false;
  }

  // Create manual upload attribution
  const attribution: ImageAttribution = {
    photographer: "Manual Upload",
    source: "Manual Upload",
    sourceUrl: "",
    license: "Unknown - Please verify",
    licenseUrl: "",
  };

  await saveAttribution(snakeId, attribution);

  console.log("\n✅ Image replacement complete!");
  console.log("\n⚠️  IMPORTANT: Please update the attribution.json file with correct license information:");
  console.log(`   ${join(outputDir, "attribution.json")}`);

  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Usage: bun run scripts/replaceSnakeImage.ts <snake-id> <image-path>");
    console.error("\nExample:");
    console.error("  bun run scripts/replaceSnakeImage.ts inland-taipan ~/Downloads/taipan.jpg");
    process.exit(1);
  }

  const [snakeId, imagePath] = args;

  const success = await replaceSnakeImage(snakeId, imagePath);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
