import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * GET — Return current non-snakes list from data/non-snakes.json (read from disk).
 * Use this so the rankings page shows the latest thumbnails after refresh/image updates.
 */
export async function GET() {
  try {
    const path = join(process.cwd(), "data", "non-snakes.json");
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load non-snakes";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
