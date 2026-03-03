import { NextResponse } from "next/server";
import { getAllSnakesMerged } from "@/lib/snakeDataServer";

type Action = "search" | "set-primary" | "add-to-gallery" | "delete" | "commit" | "delete-gallery" | "promote-to-primary" | "demote-primary" | "cleanup";
type Selection = { role: "primary" | "gallery"; candidateIndex: number };

function getSnakeByIdMerged(id: string) {
  const snakes = getAllSnakesMerged();
  return snakes.find(s => s.id === id);
}

/**
 * POST — Unified action endpoint.
 * Body: { action: Action, candidateIndex?: number, imagePath?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { id } = await params;
  const {
    searchAndDownloadCandidates,
    setPrimaryImage,
    addToGallery,
    deleteCandidate,
    commitSelections,
    deleteGalleryImage,
    promoteGalleryToPrimary,
    demotePrimaryToGallery,
  } = await import("@/lib/imageRefresh");

  let body: { action?: Action; candidateIndex?: number; selections?: Selection[]; imagePath?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, candidateIndex, selections, imagePath } = body;

  try {
    switch (action) {
      case "search": {
        const snake = getSnakeByIdMerged(id);
        const candidates = await searchAndDownloadCandidates(id, snake);
        return NextResponse.json({ success: true, candidates });
      }

      case "set-primary": {
        if (typeof candidateIndex !== "number") {
          return NextResponse.json({ error: "candidateIndex required" }, { status: 400 });
        }
        const result = await setPrimaryImage(id, candidateIndex);
        return NextResponse.json({ success: true, ...result });
      }

      case "add-to-gallery": {
        if (typeof candidateIndex !== "number") {
          return NextResponse.json({ error: "candidateIndex required" }, { status: 400 });
        }
        const result = await addToGallery(id, candidateIndex);
        return NextResponse.json({ success: true, ...result });
      }

      case "delete": {
        if (typeof candidateIndex !== "number") {
          return NextResponse.json({ error: "candidateIndex required" }, { status: 400 });
        }
        const candidates = await deleteCandidate(id, candidateIndex);
        return NextResponse.json({ success: true, candidates });
      }

      case "commit": {
        if (!Array.isArray(selections) || selections.length === 0) {
          return NextResponse.json({ error: "selections array required" }, { status: 400 });
        }
        await commitSelections(id, selections);
        return NextResponse.json({ success: true });
      }

      case "delete-gallery": {
        if (!imagePath) {
          return NextResponse.json({ error: "imagePath required" }, { status: 400 });
        }
        await deleteGalleryImage(id, imagePath);
        return NextResponse.json({ success: true });
      }

      case "promote-to-primary": {
        if (!imagePath) {
          return NextResponse.json({ error: "imagePath required" }, { status: 400 });
        }
        await promoteGalleryToPrimary(id, imagePath);
        return NextResponse.json({ success: true });
      }

      case "demote-primary": {
        await demotePrimaryToGallery(id);
        return NextResponse.json({ success: true });
      }

      case "cleanup": {
        const { cleanupCandidates } = await import("@/lib/imageRefresh");
        await cleanupCandidates(id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: search, set-primary, add-to-gallery, delete, commit, delete-gallery, promote-to-primary, demote-primary, cleanup` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`[refresh-image] ${action} failed for ${id}:`, error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET — Return current snake images and existing candidates.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    const { id } = await params;
    const { getCandidates } = await import("@/lib/imageRefresh");
    const candidates = await getCandidates(id);
    const snake = getSnakeByIdMerged(id);

    return NextResponse.json({
      candidates,
      images: snake?.images || null,
    });
  } catch (error) {
    console.error(`[refresh-image] GET failed:`, error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
