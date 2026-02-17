import { readdirSync } from "fs";
import { join } from "path";

function getRangeIds(): Set<string> {
  try {
    const rangeDir = join(process.cwd(), "public/geojson/ranges");
    return new Set(
      readdirSync(rangeDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(/\.json$/, ""))
    );
  } catch {
    return new Set();
  }
}

export function hasRangeMapForSnake(snakeId: string): boolean {
  return getRangeIds().has(snakeId);
}
