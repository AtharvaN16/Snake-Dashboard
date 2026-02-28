import { promises as fs } from "fs";
import { join } from "path";
import { atomicJsonUpdate } from "@/lib/atomicJson";

const ROOT = process.cwd();
const MAN_EDITS_PATH = join(ROOT, "data/manualEdits.json");

export interface ManualEdits {
  deletedIds: string[];
  fieldOverrides: Record<string, {
    description?: string;
    otherCommonNames?: string[];
    misidentificationRisk?: "high" | "low";
  }>;
  addedSnakes: any[];
}

async function getManualEdits(): Promise<ManualEdits> {
  try {
    const content = await fs.readFile(MAN_EDITS_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { deletedIds: [], fieldOverrides: {}, addedSnakes: [] };
  }
}

export async function deleteSnake(id: string) {
  await atomicJsonUpdate<ManualEdits>(MAN_EDITS_PATH, (data) => {
    // Add to deleted list for main database
    if (!data.deletedIds) data.deletedIds = [];
    if (!data.deletedIds.includes(id)) {
      data.deletedIds.push(id);
    }
    // Remove from draft list if it exists
    if (data.addedSnakes) {
      data.addedSnakes = data.addedSnakes.filter(s => s.id !== id);
    }
    // Remove field overrides
    if (data.fieldOverrides) {
      delete data.fieldOverrides[id];
    }
    return data;
  }, { deletedIds: [], fieldOverrides: {}, addedSnakes: [] });
}

export async function updateSnakeFields(id: string, fields: Partial<ManualEdits["fieldOverrides"][string]>) {
  await atomicJsonUpdate<ManualEdits>(MAN_EDITS_PATH, (data) => {
    if (!data.fieldOverrides) data.fieldOverrides = {};
    data.fieldOverrides[id] = {
      ...(data.fieldOverrides[id] || {}),
      ...fields,
    };
    return data;
  }, { deletedIds: [], fieldOverrides: {}, addedSnakes: [] });
}

export async function addSnakeManual(snake: any) {
  await atomicJsonUpdate<ManualEdits>(MAN_EDITS_PATH, (data) => {
    if (!data.addedSnakes) data.addedSnakes = [];
    const existingIdx = data.addedSnakes.findIndex(s => s.id === snake.id);
    if (existingIdx >= 0) {
      data.addedSnakes[existingIdx] = snake;
    } else {
      data.addedSnakes.push(snake);
    }
    return data;
  }, { deletedIds: [], fieldOverrides: {}, addedSnakes: [] });
}
