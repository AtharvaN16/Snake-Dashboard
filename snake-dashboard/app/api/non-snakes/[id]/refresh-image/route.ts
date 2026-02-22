import { NextResponse } from "next/server";
import {
  refreshNonSnakeImage,
  getNonSnakeCandidates,
  searchAndDownloadNonSnakeCandidates,
  setNonSnakeThumbnail,
} from "@/lib/nonSnakeImageRefresh";

type Action = "search" | "set-primary";

/**
 * GET — Return current candidates for this non-snake (if any).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const candidates = await getNonSnakeCandidates(id);
    return NextResponse.json({ success: true, candidates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load candidates";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST — Actions: "search" (fetch 3 candidates), "set-primary" (apply chosen candidate).
 * Body: { action: "search" } or { action: "set-primary", candidateIndex: number }.
 * Returns { success, candidates? | thumbnail?, error? } with clear messages.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Not available in production" },
      { status: 403 }
    );
  }

  const { id } = await params;
  let body: { action?: Action; candidateIndex?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { action, candidateIndex } = body;

  try {
    if (action === "search") {
      const candidates = await searchAndDownloadNonSnakeCandidates(id);
      return NextResponse.json({
        success: true,
        message: `Found ${candidates.length} candidate image(s).`,
        candidates,
      });
    }

    if (action === "set-primary") {
      if (typeof candidateIndex !== "number" || candidateIndex < 0) {
        return NextResponse.json(
          { success: false, error: "candidateIndex (0–9) is required" },
          { status: 400 }
        );
      }
      const { thumbnail } = await setNonSnakeThumbnail(id, candidateIndex);
      return NextResponse.json({
        success: true,
        message: "Image updated.",
        thumbnail: `${thumbnail}?v=${Date.now()}`,
      });
    }

    // Fallback: single-shot refresh (pick best and set)
    const result = await refreshNonSnakeImage(id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Image refreshed.",
      thumbnail: `${result.thumbnail}?v=${Date.now()}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
