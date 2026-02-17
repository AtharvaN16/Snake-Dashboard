#!/usr/bin/env bun
/**
 * Validate all snake images for quality and completeness
 * Run from project root: bun run scripts/validateImages.ts
 */

import { readFileSync } from "fs";
import { promises as fs } from "fs";
import { join } from "path";
import { getImageDimensions } from "./imageProcessing";
import type { Snake } from "../lib/types";

interface ValidationIssue {
  snakeId: string;
  commonName: string;
  issue: string;
  severity: "error" | "warning";
}

interface ValidationReport {
  total: number;
  valid: number;
  issues: ValidationIssue[];
  timestamp: string;
}

const MIN_PRIMARY_WIDTH = 600;
const MIN_PRIMARY_HEIGHT = 400;
const MIN_THUMBNAIL_WIDTH = 200;
const MIN_THUMBNAIL_HEIGHT = 150;

async function validateSnakeImages(snake: Snake): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const imageDir = join(__dirname, "../public/images/snakes", snake.id);

  // Check if image directory exists
  try {
    await fs.access(imageDir);
  } catch {
    issues.push({
      snakeId: snake.id,
      commonName: snake.commonName,
      issue: "Image directory does not exist",
      severity: "error",
    });
    return issues;
  }

  // Check primary image (now JPEG)
  const primaryPath = join(imageDir, "primary.jpg");
  try {
    await fs.access(primaryPath);
    
    // Check dimensions
    const dimensions = await getImageDimensions(primaryPath);
    if (dimensions) {
      if (dimensions.width < MIN_PRIMARY_WIDTH || dimensions.height < MIN_PRIMARY_HEIGHT) {
        issues.push({
          snakeId: snake.id,
          commonName: snake.commonName,
          issue: `Primary image too small: ${dimensions.width}x${dimensions.height} (min ${MIN_PRIMARY_WIDTH}x${MIN_PRIMARY_HEIGHT})`,
          severity: "warning",
        });
      }
    }
  } catch {
    issues.push({
      snakeId: snake.id,
      commonName: snake.commonName,
      issue: "Primary image (primary.jpg) not found",
      severity: "error",
    });
  }

  // Check thumbnail image (now JPEG)
  const thumbnailPath = join(imageDir, "thumbnail.jpg");
  try {
    await fs.access(thumbnailPath);
    
    // Check dimensions
    const dimensions = await getImageDimensions(thumbnailPath);
    if (dimensions) {
      if (dimensions.width < MIN_THUMBNAIL_WIDTH || dimensions.height < MIN_THUMBNAIL_HEIGHT) {
        issues.push({
          snakeId: snake.id,
          commonName: snake.commonName,
          issue: `Thumbnail too small: ${dimensions.width}x${dimensions.height} (min ${MIN_THUMBNAIL_WIDTH}x${MIN_THUMBNAIL_HEIGHT})`,
          severity: "warning",
        });
      }
    }
  } catch {
    issues.push({
      snakeId: snake.id,
      commonName: snake.commonName,
      issue: "Thumbnail image (thumbnail.jpg) not found",
      severity: "error",
    });
  }

  // Check original image
  const originalPath = join(imageDir, "original.jpg");
  try {
    await fs.access(originalPath);
  } catch {
    issues.push({
      snakeId: snake.id,
      commonName: snake.commonName,
      issue: "Original image backup (original.jpg) not found",
      severity: "warning",
    });
  }

  // Check attribution file
  const attributionPath = join(imageDir, "attribution.json");
  try {
    await fs.access(attributionPath);
    
    // Validate attribution content
    const content = await fs.readFile(attributionPath, "utf-8");
    const attribution = JSON.parse(content);
    
    if (!attribution.source || !attribution.license) {
      issues.push({
        snakeId: snake.id,
        commonName: snake.commonName,
        issue: "Attribution file missing required fields (source, license)",
        severity: "error",
      });
    }

    if (attribution.license === "Unknown - Please verify") {
      issues.push({
        snakeId: snake.id,
        commonName: snake.commonName,
        issue: "Attribution license needs verification (manual upload)",
        severity: "warning",
      });
    }
  } catch {
    issues.push({
      snakeId: snake.id,
      commonName: snake.commonName,
      issue: "Attribution file (attribution.json) not found or invalid",
      severity: "error",
    });
  }

  // Check gallery images (optional)
  const galleryDir = join(imageDir, "gallery");
  try {
    await fs.access(galleryDir);
    const galleryFiles = await fs.readdir(galleryDir);
    const imageFiles = galleryFiles.filter(f => f.endsWith('.jpg'));
    
    if (imageFiles.length > 0) {
      // Validate gallery metadata exists
      const galleryMetaPath = join(imageDir, "gallery-metadata.json");
      try {
        await fs.access(galleryMetaPath);
      } catch {
        issues.push({
          snakeId: snake.id,
          commonName: snake.commonName,
          issue: "Gallery images present but gallery-metadata.json missing",
          severity: "warning",
        });
      }
    }
  } catch {
    // Gallery is optional, no issue if directory doesn't exist
  }

  return issues;
}

async function main() {
  console.log("🔍 Snake Image Validation");
  console.log("==========================\n");

  // Load snake data
  const dataPath = join(__dirname, "../data/snakes/index.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  const snakes: Snake[] = data.snakes;

  console.log(`Validating images for ${snakes.length} snakes...\n`);

  const report: ValidationReport = {
    total: snakes.length,
    valid: 0,
    issues: [],
    timestamp: new Date().toISOString(),
  };

  // Validate each snake
  for (let i = 0; i < snakes.length; i++) {
    const snake = snakes[i];
    process.stdout.write(`\r[${i + 1}/${snakes.length}] ${snake.commonName.padEnd(40)}`);

    const issues = await validateSnakeImages(snake);
    
    if (issues.length === 0) {
      report.valid++;
    } else {
      report.issues.push(...issues);
    }
  }

  console.log("\n");
  console.log("=".repeat(60));
  console.log("📊 VALIDATION REPORT");
  console.log("=".repeat(60));
  console.log(`Total snakes: ${report.total}`);
  console.log(`✓ Valid (no issues): ${report.valid}`);
  console.log(`⚠️  With issues: ${report.total - report.valid}`);
  console.log("=".repeat(60));

  // Group issues by severity
  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    const errorsBySnake = new Map<string, string[]>();
    errors.forEach((e) => {
      if (!errorsBySnake.has(e.snakeId)) {
        errorsBySnake.set(e.snakeId, []);
      }
      errorsBySnake.get(e.snakeId)!.push(e.issue);
    });

    errorsBySnake.forEach((issues, snakeId) => {
      const snake = snakes.find((s) => s.id === snakeId);
      console.log(`\n  ${snakeId} (${snake?.commonName}):`);
      issues.forEach((issue) => console.log(`    - ${issue}`));
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    const warningsBySnake = new Map<string, string[]>();
    warnings.forEach((w) => {
      if (!warningsBySnake.has(w.snakeId)) {
        warningsBySnake.set(w.snakeId, []);
      }
      warningsBySnake.get(w.snakeId)!.push(w.issue);
    });

    warningsBySnake.forEach((issues, snakeId) => {
      const snake = snakes.find((s) => s.id === snakeId);
      console.log(`\n  ${snakeId} (${snake?.commonName}):`);
      issues.forEach((issue) => console.log(`    - ${issue}`));
    });
  }

  // Save report
  const reportPath = join(__dirname, "../temp/validation-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Exit with error if critical issues found
  if (errors.length > 0) {
    console.log("\n⚠️  Validation failed with errors");
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log("\n✅ Validation passed with warnings");
    process.exit(0);
  } else {
    console.log("\n✅ All images validated successfully!");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
