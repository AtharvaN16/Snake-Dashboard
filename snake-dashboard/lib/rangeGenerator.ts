import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync } from "fs";

const execPromise = promisify(exec);

export async function generateRangeMap(id: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Run the existing fetch script
    const { stdout, stderr } = await execPromise(`bun run scripts/fetchINatRangeGeojsons.ts --id ${id}`);
    
    const expectedPath = `/geojson/ranges/${id}.json`;
    const fullPath = join(process.cwd(), "public", expectedPath.replace(/^\//, ""));
    
    if (existsSync(fullPath)) {
      return { success: true, path: expectedPath };
    } else {
      return { success: false, error: "GeoJSON was not created. No match found on iNaturalist." };
    }
  } catch (e) {
    console.error("Range generation failed:", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
