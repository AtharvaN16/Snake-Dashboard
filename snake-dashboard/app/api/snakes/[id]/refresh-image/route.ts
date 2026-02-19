import { NextResponse } from "next/server";
import { getSnakeById } from "@/lib/snakeData";
import {
  searchSnakeImagesAllSources,
  downloadBestCandidate,
  saveAttribution,
  type ImageAttribution,
} from "@/scripts/sourceSnakeImages";
import { processSnakeImage } from "@/scripts/imageProcessing";

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
      return NextResponse.json({ error: "No images found" }, { status: 404 });
    }

    const downloadResult = await downloadBestCandidate(result.combined, id);
    if (!downloadResult || "tryAlternateSource" in downloadResult) {
      return NextResponse.json({ error: "Failed to download image" }, { status: 502 });
    }

    const processed = await processSnakeImage(downloadResult.imagePath, id);
    if (!processed) {
      return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
    }

    await saveAttribution(id, downloadResult.attribution);

    return NextResponse.json({
      success: true,
      attribution: downloadResult.attribution,
      images: processed,
    });
  } catch (error) {
    console.error(`Error refreshing image for ${id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
