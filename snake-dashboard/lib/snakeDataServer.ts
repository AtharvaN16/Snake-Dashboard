import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Snake, SnakeDatabase } from "./types";
import snakesData from "@/data/snakes/index.json";

/**
 * Server-only utility to load snakes and merge manual edits.
 */
export function getAllSnakesMerged(): Snake[] {
  const baseData = snakesData as SnakeDatabase;
  const baseSnakes = baseData.snakes;

  try {
    const editsPath = join(process.cwd(), "data/manualEdits.json");
    if (existsSync(editsPath)) {
      const raw = readFileSync(editsPath, "utf-8");
      const edits = JSON.parse(raw);
      
      const deletedIds = new Set(edits.deletedIds || []);
      const fieldOverrides = edits.fieldOverrides || {};
      const addedSnakes = edits.addedSnakes || [];

      // Combine and filter
      const combined = [...baseSnakes, ...addedSnakes];
      const result = combined
        .filter(s => !deletedIds.has(s.id))
        .map(s => {
          if (fieldOverrides[s.id]) {
            return { ...s, ...fieldOverrides[s.id] };
          }
          return s;
        });

      // Deduplicate by ID
      const byId = new Map<string, Snake>();
      result.forEach(s => byId.set(s.id, s));
      return Array.from(byId.values());
    }
  } catch (err) {
    console.error("[snakeDataServer] Runtime merge failed:", err);
  }

  return baseSnakes;
}
