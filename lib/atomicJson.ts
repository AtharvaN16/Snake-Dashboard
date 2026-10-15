import { promises as fs } from "fs";
import { join, dirname } from "path";

/**
 * Atomic JSON read-modify-write.
 * Reads the file, applies `updater`, writes to a temp file, then renames
 * (POSIX atomic rename guarantee) so readers never see a partial write.
 */
export async function atomicJsonUpdate<T>(
  filePath: string,
  updater: (data: T) => T,
  defaultValue?: T
): Promise<T> {
  let data: T;
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    data = JSON.parse(raw) as T;
  } catch (err) {
    if (defaultValue !== undefined) {
      data = defaultValue;
    } else {
      throw err;
    }
  }
  
  const updated = updater(data);
  const dir = dirname(filePath);
  
  // Ensure the directory exists
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Already exists or can't create
  }

  const tmp = join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await fs.writeFile(tmp, JSON.stringify(updated, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
  return updated;
}
