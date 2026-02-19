import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import sharp from "sharp";
import { getSnakeById } from "@/lib/snakeData";
import {
  searchSnakeImagesAllSources,
  downloadImage,
  type ImageAttribution,
  type ImageCandidate,
} from "@/scripts/sourceSnakeImages";

const ROOT = process.cwd();

async function loadCurrentAttribution(
  snakeId: string
): Promise<ImageAttribution | null> {
  const attrPath = join(ROOT, "public/images/snakes", snakeId, "attribution.json");
  try {
    const content = await fs.readFile(attrPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function downloadBest(
  candidates: ImageCandidate[],
  snakeId: string
): Promise<{ imagePath: string; attribution: ImageAttribution } | null> {
  const tempDir = join(ROOT, "temp");
  await fs.mkdir(tempDir, { recursive: true });

  for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const candidate = candidates[i];
    const tempPath = join(tempDir, `${snakeId}-candidate-${i}.jpg`);
    const result = await downloadImage(candidate.url, tempPath);
    if (result === true) {
      return { imagePath: tempPath, attribution: candidate.attribution };
    }
  }
  return null;
}

async function processImage(
  sourcePath: string,
  snakeId: string
): Promise<{ primary: string; thumbnail: string } | null> {
  const outputDir = join(ROOT, "public/images/snakes", snakeId);
  await fs.mkdir(outputDir, { recursive: true });

  const primaryPath = join(outputDir, "primary.jpg");
  const thumbnailPath = join(outputDir, "thumbnail.jpg");
  const originalPath = join(outputDir, "original.jpg");

  try {
    await fs.copyFile(sourcePath, originalPath);

    await sharp(sourcePath)
      .resize(800, 600, {
        fit: "contain",
        background: { r: 245, g: 245, b: 240 },
        position: "center",
      })
      .jpeg({ quality: 90 })
      .toFile(primaryPath);

    await sharp(sourcePath)
      .resize(300, 225, {
        fit: "cover",
        background: { r: 245, g: 245, b: 240 },
        position: "center",
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);

    return {
      primary: `/images/snakes/${snakeId}/primary.jpg`,
      thumbnail: `/images/snakes/${snakeId}/thumbnail.jpg`,
    };
  } catch (error) {
    console.error(`Error processing image for ${snakeId}:`, error);
    return null;
  }
}

async function saveAttr(
  snakeId: string,
  attribution: ImageAttribution
): Promise<void> {
  const attrPath = join(ROOT, "public/images/snakes", snakeId, "attribution.json");
  await fs.writeFile(attrPath, JSON.stringify(attribution, null, 2), "utf-8");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { id } = await params;
  const snake = getSnakeById(id);
  if (!snake) {
    return NextResponse.json({ error: "Snake not found" }, { status: 404 });
  }

  try {
    const result = await searchSnakeImagesAllSources(snake.scientificName);

    if (result.combined.length === 0) {
      return NextResponse.json({ error: "No images found from any source" }, { status: 404 });
    }

    // Skip the candidate that matches the current image so we cycle to a new one
    const currentAttr = await loadCurrentAttribution(id);
    let candidates = result.combined;
    if (currentAttr?.sourceUrl) {
      const filtered = candidates.filter(
        (c) => c.attribution.sourceUrl !== currentAttr.sourceUrl
      );
      // Only use the filtered list if there are alternatives; otherwise wrap around
      if (filtered.length > 0) {
        candidates = filtered;
      }
    }

    const downloadResult = await downloadBest(candidates, id);
    if (!downloadResult) {
      return NextResponse.json({ error: "Failed to download image" }, { status: 502 });
    }

    const processed = await processImage(downloadResult.imagePath, id);
    if (!processed) {
      return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
    }

    await saveAttr(id, downloadResult.attribution);

    // Clear Next.js image optimization cache so the new file is served
    const imageCacheDir = join(ROOT, ".next/cache/images");
    try {
      await fs.rm(imageCacheDir, { recursive: true, force: true });
    } catch {
      // Cache dir may not exist, that's fine
    }

    return NextResponse.json({
      success: true,
      attribution: downloadResult.attribution,
      images: processed,
      candidatesAvailable: result.combined.length,
    });
  } catch (error) {
    console.error(`Error refreshing image for ${id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
