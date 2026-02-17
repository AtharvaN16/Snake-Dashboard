/**
 * Image processing utilities for snake images
 * Handles resizing and optimization (no background removal)
 */

import { promises as fs } from "fs";
import { join } from "path";
import sharp from "sharp";

export interface ImageProcessingOptions {
  primaryWidth?: number;
  primaryHeight?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface ProcessedImages {
  primary: string;
  thumbnail: string;
  original: string;
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  primaryWidth: 800,
  primaryHeight: 600,
  thumbnailWidth: 300,
  thumbnailHeight: 225,
};

/**
 * Resize and optimize an image
 */
export async function resizeImage(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number,
  fit: "contain" | "cover" = "contain"
): Promise<void> {
  const background = { r: 245, g: 245, b: 240 }; // Neutral beige background
  
  await sharp(inputPath)
    .resize(width, height, {
      fit,
      background,
      position: "center",
    })
    .jpeg({ quality: fit === "cover" ? 85 : 90 })
    .toFile(outputPath);
}

/**
 * Process a downloaded image: resize and optimize (no background removal)
 */
export async function processSnakeImage(
  sourcePath: string,
  snakeId: string,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImages | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Create output directory
  const outputDir = join(
    __dirname,
    "../public/images/snakes",
    snakeId
  );
  await fs.mkdir(outputDir, { recursive: true });

  // Define output paths (now using JPEG)
  const primaryPath = join(outputDir, "primary.jpg");
  const thumbnailPath = join(outputDir, "thumbnail.jpg");
  const originalPath = join(outputDir, "original.jpg");

  try {
    // Copy original
    await fs.copyFile(sourcePath, originalPath);
    console.log(`✓ Saved original image for ${snakeId}`);

    // Create primary image (resized, contained with neutral background)
    console.log(`Creating primary image for ${snakeId}...`);
    await resizeImage(
      sourcePath,
      primaryPath,
      opts.primaryWidth,
      opts.primaryHeight,
      "contain"
    );

    // Create thumbnail (cropped to fill for consistent card sizes)
    console.log(`Creating thumbnail for ${snakeId}...`);
    await resizeImage(
      sourcePath,
      thumbnailPath,
      opts.thumbnailWidth,
      opts.thumbnailHeight,
      "cover"
    );

    console.log(`✓ Successfully processed images for ${snakeId}`);
    
    return {
      primary: `/images/snakes/${snakeId}/primary.jpg`,
      thumbnail: `/images/snakes/${snakeId}/thumbnail.jpg`,
      original: `/images/snakes/${snakeId}/original.jpg`,
    };
  } catch (error) {
    console.error(`Error processing image for ${snakeId}:`, error);
    return null;
  }
}

/**
 * Check if an image already exists for a snake
 */
export async function hasExistingImages(snakeId: string): Promise<boolean> {
  const primaryPath = join(
    __dirname,
    "../public/images/snakes",
    snakeId,
    "primary.jpg"  // Changed from .png to .jpg
  );
  
  try {
    await fs.access(primaryPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.error("Failed to get image dimensions:", error);
    return null;
  }
}
