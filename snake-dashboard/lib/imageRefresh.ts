import { promises as fs } from "fs";
import { join, dirname } from "path";
import sharp from "sharp";
import { getSnakeById } from "@/lib/snakeData";
import { atomicJsonUpdate } from "@/lib/atomicJson";
import type { Snake } from "@/lib/types";
import {
  searchSnakeImagesAllSources,
  downloadImage,
  type ImageAttribution,
} from "@/scripts/sourceSnakeImages";

const ROOT = process.cwd();
const DATA_PATH = join(ROOT, "data/snakes/index.json");

export interface CandidateEntry {
  index: number;
  src: string;
  source: string;
  score: number;
  attribution: ImageAttribution;
}

function candidatesDir(snakeId: string) {
  return join(ROOT, "public/images/snakes", snakeId, "candidates");
}

function metadataPath(snakeId: string) {
  return join(candidatesDir(snakeId), "metadata.json");
}

function snakeDir(snakeId: string) {
  return join(ROOT, "public/images/snakes", snakeId);
}

function galleryMetadataPath(snakeId: string) {
  return join(snakeDir(snakeId), "gallery-metadata.json");
}

/** Atomic file write: write to temp then rename */
async function atomicWrite(targetPath: string, data: Buffer | string) {
  const dir = dirname(targetPath);
  const tmp = join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, targetPath);
}

// ---------------------------------------------------------------------------
// getCandidates
// ---------------------------------------------------------------------------

export async function getCandidates(snakeId: string): Promise<CandidateEntry[]> {
  try {
    const content = await fs.readFile(metadataPath(snakeId), "utf-8");
    return JSON.parse(content) as CandidateEntry[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// searchAndDownloadCandidates
// ---------------------------------------------------------------------------

export async function searchAndDownloadCandidates(
  snakeId: string,
  providedSnake?: Snake
): Promise<CandidateEntry[]> {
  const snake = providedSnake || getSnakeById(snakeId);
  if (!snake) throw new Error(`Snake not found: ${snakeId}`);

  console.log(`[imageRefresh] Searching for ${snake.scientificName} and ${snake.commonName}...`);
  
  // Helper to run search safely without throwing
  const safeSearch = async (query: string) => {
    try {
      return await searchSnakeImagesAllSources(query);
    } catch (e) {
      console.error(`[imageRefresh] Search failed for "${query}":`, e);
      return { wikimedia: [], iNaturalist: [], gbif: [], combined: [] };
    }
  };

  // Run both searches in parallel
  const [sciResult, commonResult] = await Promise.all([
    safeSearch(snake.scientificName),
    snake.commonName ? safeSearch(snake.commonName) : Promise.resolve({ combined: [] })
  ]);

  // Combine and deduplicate by image URL
  const allCandidates = [...(sciResult as any).combined, ...(commonResult as any).combined];
  if (allCandidates.length === 0) {
    throw new Error(`No images found for "${snake.scientificName}" or "${snake.commonName}" across Wikimedia, iNaturalist, or GBIF.`);
  }

  const deduped = new Map<string, any>();
  for (const c of allCandidates) {
    if (!deduped.has(c.url) || c.score > deduped.get(c.url).score) {
      deduped.set(c.url, c);
    }
  }

  const combined = Array.from(deduped.values()).sort((a, b) => b.score - a.score);

  // Clean previous candidates
  const dir = candidatesDir(snakeId);
  try { await fs.rm(dir, { recursive: true, force: true }); } catch { /* ok */ }
  await fs.mkdir(dir, { recursive: true });

  const maxCandidates = 30;
  const toDownload = combined.slice(0, maxCandidates);

  // Download all candidates in parallel
  const results = await Promise.allSettled(
    toDownload.map(async (candidate, i) => {
      const originalPath = join(dir, `original-${i}.jpg`);
      const dlResult = await downloadImage(candidate.url, originalPath);
      if (dlResult !== true) return null;

      // Create thumbnail from buffer (avoid sharp file-path caching)
      const buffer = await fs.readFile(originalPath);
      const thumbPath = join(dir, `thumb-${i}.jpg`);
      await sharp(buffer)
        .resize(400, 300, { fit: "cover", position: "center" })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      return {
        index: i,
        src: `/images/snakes/${snakeId}/candidates/thumb-${i}.jpg`,
        source: candidate.attribution.source,
        score: Math.round(candidate.score),
        attribution: candidate.attribution,
      } satisfies CandidateEntry;
    })
  );

  const entries = results
    .filter((r): r is PromiseFulfilledResult<CandidateEntry | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((e): e is CandidateEntry => e !== null);

  if (entries.length === 0) {
    throw new Error("Failed to download any candidates");
  }

  await atomicWrite(metadataPath(snakeId), JSON.stringify(entries, null, 2));
  return entries;
}

// ---------------------------------------------------------------------------
// setPrimaryImage
// ---------------------------------------------------------------------------

export async function setPrimaryImage(
  snakeId: string,
  candidateIndex: number,
  options: { skipIndexUpdate?: boolean } = {}
): Promise<{ candidateIndex: number; attribution: ImageAttribution }> {
  const meta = await loadMetadata(snakeId);
  const entry = meta.find((e) => e.index === candidateIndex);
  if (!entry) throw new Error(`Candidate ${candidateIndex} not found`);

  const dir = candidatesDir(snakeId);
  const originalPath = join(dir, `original-${candidateIndex}.jpg`);

  // Read into buffer — avoids sharp's file-path caching bug
  const imageBuffer = await fs.readFile(originalPath);

  console.log(
    `[set-primary] ${snakeId}: candidate ${candidateIndex} (${imageBuffer.length} bytes) from ${entry.attribution.source}`
  );

  const sd = snakeDir(snakeId);
  await fs.mkdir(sd, { recursive: true });

  // Process primary and thumbnail from buffer, write atomically
  const primaryBuf = await sharp(imageBuffer)
    .resize(800, 600, {
      fit: "contain",
      background: { r: 245, g: 245, b: 240 },
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const thumbBuf = await sharp(imageBuffer)
    .resize(300, 225, {
      fit: "cover",
      background: { r: 245, g: 245, b: 240 },
      position: "center",
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  await atomicWrite(join(sd, "primary.jpg"), primaryBuf);
  await atomicWrite(join(sd, "thumbnail.jpg"), thumbBuf);
  await atomicWrite(join(sd, "original.jpg"), imageBuffer);
  await atomicWrite(
    join(sd, "attribution.json"),
    JSON.stringify(entry.attribution, null, 2)
  );

  if (!options.skipIndexUpdate) {
    await atomicJsonUpdate<SnakeData>(DATA_PATH, (data) => {
      const snake = data.snakes.find((s) => s.id === snakeId);
      if (snake) {
        if (!snake.images) {
          // Initialize images if missing
          snake.images = {
            primary: `/images/snakes/${snakeId}/primary.jpg`,
            thumbnail: `/images/snakes/${snakeId}/thumbnail.jpg`,
            attribution: entry.attribution,
          };
        } else {
          snake.images.primary = `/images/snakes/${snakeId}/primary.jpg`;
          snake.images.thumbnail = `/images/snakes/${snakeId}/thumbnail.jpg`;
          snake.images.attribution = entry.attribution;
        }
      }
      return data;
    });
  }

  console.log(`[set-primary] ${snakeId}: done — candidate ${candidateIndex} is now primary`);

  return { candidateIndex, attribution: entry.attribution };
}

// ---------------------------------------------------------------------------
// addToGallery
// ---------------------------------------------------------------------------

interface SnakeData {
  snakes: Array<{
    id: string;
    images?: {
      primary: string;
      thumbnail: string;
      attribution: ImageAttribution;
      gallery?: string[];
      galleryAttributions?: ImageAttribution[];
    };
  }>;
}

export async function addToGallery(
  snakeId: string,
  candidateIndex: number,
  options: { skipIndexUpdate?: boolean; galleryIndex?: number } = {}
): Promise<{ galleryPath: string; galleryIndex: number }> {
  const meta = await loadMetadata(snakeId);
  const entry = meta.find((e) => e.index === candidateIndex);
  if (!entry) throw new Error(`Candidate ${candidateIndex} not found`);

  const dir = candidatesDir(snakeId);
  const originalPath = join(dir, `original-${candidateIndex}.jpg`);

  const imageBuffer = await fs.readFile(originalPath);

  // Determine gallery slot
  const galleryDir = join(snakeDir(snakeId), "gallery");
  await fs.mkdir(galleryDir, { recursive: true });

  let nextNum = options.galleryIndex;
  if (nextNum === undefined) {
    const existing = await fs.readdir(galleryDir);
    const numbers = existing
      .filter((f) => /^\d+\.jpg$/.test(f))
      .map((f) => parseInt(f, 10));
    nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  }
  
  const publicPath = `/images/snakes/${snakeId}/gallery/${nextNum}.jpg`;

  // Process from buffer, write atomically
  const galleryBuf = await sharp(imageBuffer)
    .resize(800, 600, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toBuffer();

  await atomicWrite(join(galleryDir, `${nextNum}.jpg`), galleryBuf);

  if (!options.skipIndexUpdate) {
    // Atomic JSON update of index.json
    await atomicJsonUpdate<SnakeData>(DATA_PATH, (data) => {
      const snake = data.snakes.find((s) => s.id === snakeId);
      if (snake) {
        if (!snake.images) throw new Error("Snake images not initialized — set primary first");
        if (!snake.images.gallery) snake.images.gallery = [];
        if (!snake.images.galleryAttributions) snake.images.galleryAttributions = [];
        snake.images.gallery.push(publicPath);
        snake.images.galleryAttributions.push(entry.attribution);
      }
      return data;
    });
    await syncGalleryMetadataFromIndex(snakeId);
  }

  console.log(`[add-to-gallery] ${snakeId}: added candidate ${candidateIndex} as gallery/${nextNum}.jpg`);

  return { galleryPath: publicPath, galleryIndex: nextNum };
}

// ---------------------------------------------------------------------------
// deleteCandidate
// ---------------------------------------------------------------------------

export async function deleteCandidate(
  snakeId: string,
  candidateIndex: number
): Promise<CandidateEntry[]> {
  const dir = candidatesDir(snakeId);
  const meta = await loadMetadata(snakeId);

  // Remove files
  for (const prefix of ["original", "thumb"]) {
    try {
      await fs.unlink(join(dir, `${prefix}-${candidateIndex}.jpg`));
    } catch { /* ok if missing */ }
  }

  // Update metadata atomically
  const updated = meta.filter((e) => e.index !== candidateIndex);
  await atomicWrite(metadataPath(snakeId), JSON.stringify(updated, null, 2));

  return updated;
}

// ---------------------------------------------------------------------------
// deleteGalleryImage
// ---------------------------------------------------------------------------

export async function promoteGalleryToPrimary(
  snakeId: string,
  imagePath: string
): Promise<void> {
  const meta = await fs.readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(meta) as SnakeData;
  const snake = data.snakes.find((s) => s.id === snakeId);

  if (!snake || !snake.images || !snake.images.gallery) {
    throw new Error("Snake or gallery not found");
  }

  const galleryIdx = snake.images.gallery.indexOf(imagePath);
  if (galleryIdx === -1) throw new Error("Gallery image not found in index");

  const newPrimaryAttribution = snake.images.galleryAttributions?.[galleryIdx];
  if (!newPrimaryAttribution) throw new Error("Attribution not found for gallery image");

  // Keep reference to the old primary info
  const oldPrimaryAttribution = snake.images.attribution;
  const sd = snakeDir(snakeId);
  const oldPrimaryPath = join(sd, "original.jpg"); // We usually keep the high-res original

  // 1. Read the NEW primary (currently in gallery)
  const relativePath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  const newPrimarySourcePath = join(ROOT, "public", relativePath);
  const newPrimaryBuffer = await fs.readFile(newPrimarySourcePath);

  // 2. Read the OLD primary
  let oldPrimaryBuffer: Buffer | null = null;
  try {
    oldPrimaryBuffer = await fs.readFile(oldPrimaryPath);
  } catch {
    // Fallback to primary.jpg if original.jpg is missing
    try {
      oldPrimaryBuffer = await fs.readFile(join(sd, "primary.jpg"));
    } catch { /* ignore */ }
  }

  // 3. Process the NEW primary images
  const primaryBuf = await sharp(newPrimaryBuffer)
    .resize(800, 600, {
      fit: "contain",
      background: { r: 245, g: 245, b: 240 },
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const thumbBuf = await sharp(newPrimaryBuffer)
    .resize(300, 225, {
      fit: "cover",
      background: { r: 245, g: 245, b: 240 },
      position: "center",
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  await atomicWrite(join(sd, "primary.jpg"), primaryBuf);
  await atomicWrite(join(sd, "thumbnail.jpg"), thumbBuf);
  await atomicWrite(join(sd, "original.jpg"), newPrimaryBuffer);
  await atomicWrite(
    join(sd, "attribution.json"),
    JSON.stringify(newPrimaryAttribution, null, 2)
  );

  // 4. Move OLD primary to gallery
  let movedOldToGalleryPath: string | null = null;
  if (oldPrimaryBuffer) {
    const galleryDir = join(sd, "gallery");
    await fs.mkdir(galleryDir, { recursive: true });
    const files = await fs.readdir(galleryDir);
    const nums = files.filter(f => /^\d+\.jpg$/.test(f)).map(f => parseInt(f, 10));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    
    const galleryBuf = await sharp(oldPrimaryBuffer)
      .resize(800, 600, { fit: "cover", position: "center" })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    await atomicWrite(join(galleryDir, `${nextNum}.jpg`), galleryBuf);
    movedOldToGalleryPath = `/images/snakes/${snakeId}/gallery/${nextNum}.jpg`;
  }

  // 5. Update index.json (Atomic update for the swap)
  await atomicJsonUpdate<SnakeData>(DATA_PATH, (d) => {
    const s = d.snakes.find((sn) => sn.id === snakeId);
    if (s && s.images && s.images.gallery && s.images.galleryAttributions) {
      // Set new primary
      s.images.primary = `/images/snakes/${snakeId}/primary.jpg`;
      s.images.thumbnail = `/images/snakes/${snakeId}/thumbnail.jpg`;
      s.images.attribution = newPrimaryAttribution;

      // Remove the promoted image from gallery
      s.images.gallery.splice(galleryIdx, 1);
      s.images.galleryAttributions.splice(galleryIdx, 1);

      // Add the old primary to gallery
      if (movedOldToGalleryPath && oldPrimaryAttribution) {
        s.images.gallery.push(movedOldToGalleryPath);
        s.images.galleryAttributions.push(oldPrimaryAttribution);
      }
    }
    return d;
  });

  // 6. Delete the old gallery file of the promoted image
  try {
    await fs.unlink(newPrimarySourcePath);
  } catch { /* already moved or gone */ }

  await syncGalleryMetadataFromIndex(snakeId);
  console.log(`[promote-gallery] ${snakeId}: swapped gallery ${imagePath} with primary`);
}

export async function deleteGalleryImage(
  snakeId: string,
  imagePath: string
): Promise<void> {
  // 1. Update index.json first
  await atomicJsonUpdate<SnakeData>(DATA_PATH, (data) => {
    const snake = data.snakes.find((s) => s.id === snakeId);
    if (snake && snake.images?.gallery) {
      const idx = snake.images.gallery.indexOf(imagePath);
      if (idx !== -1) {
        snake.images.gallery.splice(idx, 1);
        if (snake.images.galleryAttributions) {
          snake.images.galleryAttributions.splice(idx, 1);
        }
        console.log(`[delete-gallery] ${snakeId}: removed ${imagePath} from index.json`);
      }
    }
    return data;
  });

  // 2. Delete the file from public/
  // imagePath is usually /images/snakes/[id]/gallery/[n].jpg
  const relativePath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  const fullPath = join(ROOT, "public", relativePath);
  
  try {
    await fs.unlink(fullPath);
    console.log(`[delete-gallery] ${snakeId}: deleted file ${fullPath}`);
  } catch (err) {
    console.warn(`[delete-gallery] ${snakeId}: could not delete file ${fullPath} (might already be gone)`);
  }

  await syncGalleryMetadataFromIndex(snakeId);
}

export async function demotePrimaryToGallery(snakeId: string): Promise<void> {
  const sd = snakeDir(snakeId);
  const primaryPath = join(sd, "primary.jpg");
  const originalPath = join(sd, "original.jpg");
  const attributionPath = join(sd, "attribution.json");

  const primaryExists = existsSync(primaryPath);
  if (!primaryExists) throw new Error("Primary image not found");

  // 1. Read the current primary attribution
  let primaryAttribution: ImageAttribution;
  try {
    const attrRaw = await fs.readFile(attributionPath, "utf-8");
    primaryAttribution = JSON.parse(attrRaw) as ImageAttribution;
  } catch {
    primaryAttribution = { source: "Unknown", license: "Unknown", sourceUrl: "", licenseUrl: "" };
  }

  // 2. Read primary file into buffer
  const imageBuffer = await fs.readFile(existsSync(originalPath) ? originalPath : primaryPath);

  // 3. Move to gallery folder
  const galleryDir = join(sd, "gallery");
  await fs.mkdir(galleryDir, { recursive: true });
  const files = await fs.readdir(galleryDir);
  const nums = files.filter(f => /^\d+\.jpg$/.test(f)).map(f => parseInt(f, 10));
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const publicPath = `/images/snakes/${snakeId}/gallery/${nextNum}.jpg`;

  const galleryBuf = await sharp(imageBuffer)
    .resize(800, 600, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toBuffer();

  await atomicWrite(join(galleryDir, `${nextNum}.jpg`), galleryBuf);

  // 4. Update index.json (Add to gallery, clear primary)
  await atomicJsonUpdate<SnakeData>(DATA_PATH, (data) => {
    const snake = data.snakes.find((s) => s.id === snakeId);
    if (snake && snake.images) {
      if (!snake.images.gallery) snake.images.gallery = [];
      if (!snake.images.galleryAttributions) snake.images.galleryAttributions = [];
      
      snake.images.gallery.push(publicPath);
      snake.images.galleryAttributions.push(primaryAttribution);
      
      // Clear primary fields in the data
      snake.images.primary = "";
      snake.images.thumbnail = "";
    }
    return data;
  });

  // 5. Delete primary files from disk
  await fs.unlink(primaryPath).catch(() => {});
  if (existsSync(originalPath)) await fs.unlink(originalPath).catch(() => {});
  await fs.unlink(join(sd, "thumbnail.jpg")).catch(() => {});
  await fs.unlink(attributionPath).catch(() => {});

  await syncGalleryMetadataFromIndex(snakeId);
  console.log(`[demote-primary] ${snakeId}: moved primary to gallery/${nextNum}.jpg`);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function loadMetadata(snakeId: string): Promise<CandidateEntry[]> {
  try {
    const raw = await fs.readFile(metadataPath(snakeId), "utf-8");
    return JSON.parse(raw) as CandidateEntry[];
  } catch {
    throw new Error("No candidates found — search first");
  }
}

async function cleanupCandidates(snakeId: string): Promise<void> {
  const dir = candidatesDir(snakeId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    console.log(`[cleanup] ${snakeId}: removed candidates directory`);
  } catch { /* already gone */ }
}

async function syncGalleryMetadataFromIndex(snakeId: string): Promise<void> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as SnakeData;
  const snake = data.snakes.find((s) => s.id === snakeId);
  const outPath = galleryMetadataPath(snakeId);

  const gallery = snake?.images?.gallery ?? [];
  if (gallery.length === 0) {
    try {
      await fs.unlink(outPath);
      console.log(`[gallery-meta] ${snakeId}: removed empty gallery-metadata.json`);
    } catch {
      // no-op
    }
    return;
  }

  const galleryAttributions = snake?.images?.galleryAttributions ?? [];
  const fallback = snake?.images?.attribution ?? { 
    source: "Unknown", 
    license: "Unknown",
    sourceUrl: "",
    licenseUrl: "" 
  };
  const alignedAttributions = gallery.map(
    (_img, idx) => galleryAttributions[idx] ?? fallback
  );

  const payload = {
    images: gallery,
    attributions: alignedAttributions,
  };
  await atomicWrite(outPath, JSON.stringify(payload, null, 2));
}

// ---------------------------------------------------------------------------
// commitSelections — batch process selections, then clean up candidates
// ---------------------------------------------------------------------------

export interface Selection {
  candidateIndex: number;
  role: "primary" | "gallery";
}

export async function commitSelections(
  snakeId: string,
  selections: Selection[]
): Promise<void> {
  if (selections.length === 0) throw new Error("No selections provided");

  const meta = await loadMetadata(snakeId);

  // Validate all selections up front
  for (const sel of selections) {
    if (!meta.find((e) => e.index === sel.candidateIndex)) {
      throw new Error(`Candidate ${sel.candidateIndex} not found`);
    }
  }

  const primarySel = selections.find((s) => s.role === "primary");
  const gallerySels = selections.filter((s) => s.role === "gallery");

  // 1. Process primary if selected (skip index update for now)
  let primaryAttribution: ImageAttribution | undefined;
  if (primarySel) {
    const result = await setPrimaryImage(snakeId, primarySel.candidateIndex, {
      skipIndexUpdate: true,
    });
    primaryAttribution = result.attribution;
  }

  // 2. Process gallery images (skip index update for now)
  let galleryResults: Array<{ path: string; attribution: ImageAttribution }> = [];
  if (gallerySels.length > 0) {
    // Determine starting gallery index to avoid race conditions and redundant reads
    const galleryDir = join(snakeDir(snakeId), "gallery");
    await fs.mkdir(galleryDir, { recursive: true });
    const existing = await fs.readdir(galleryDir);
    const numbers = existing
      .filter((f) => /^\d+\.jpg$/.test(f))
      .map((f) => parseInt(f, 10));
    let nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    // Process in parallel, assigning indexes upfront and maintaining order
    galleryResults = await Promise.all(
      gallerySels.map(async (sel, i) => {
        const gIdx = nextNum + i;
        const entry = meta.find((e) => e.index === sel.candidateIndex)!;
        await addToGallery(snakeId, sel.candidateIndex, {
          skipIndexUpdate: true,
          galleryIndex: gIdx,
        });
        return {
          path: `/images/snakes/${snakeId}/gallery/${gIdx}.jpg`,
          attribution: entry.attribution,
        };
      })
    );
  }

  // 3. Single atomic JSON update for everything
  await atomicJsonUpdate<SnakeData>(DATA_PATH, (data) => {
    const snake = data.snakes.find((s) => s.id === snakeId);
    if (snake) {
      // Initialize images if missing
      if (!snake.images) {
        if (primaryAttribution) {
          snake.images = {
            primary: `/images/snakes/${snakeId}/primary.jpg`,
            thumbnail: `/images/snakes/${snakeId}/thumbnail.jpg`,
            attribution: primaryAttribution,
            gallery: [],
            galleryAttributions: [],
          };
        } else if (galleryResults.length > 0) {
          // This case is unlikely (adding gallery without primary), but let's be safe
          // We need some primary/thumbnail even if it's not set here?
          // For now, let's just initialize it with empty gallery
          snake.images = {
            primary: "", 
            thumbnail: "",
            attribution: { source: "", license: "", sourceUrl: "", licenseUrl: "" },
            gallery: [],
            galleryAttributions: [],
          };
        }
      }

      // Update primary if we have it
      if (primaryAttribution && snake.images) {
        snake.images.primary = `/images/snakes/${snakeId}/primary.jpg`;
        snake.images.thumbnail = `/images/snakes/${snakeId}/thumbnail.jpg`;
        snake.images.attribution = primaryAttribution;
      }

      // Add gallery images
      if (galleryResults.length > 0 && snake.images) {
        if (!snake.images.gallery) snake.images.gallery = [];
        if (!snake.images.galleryAttributions) snake.images.galleryAttributions = [];
        
        for (const res of galleryResults) {
          snake.images.gallery.push(res.path);
          snake.images.galleryAttributions.push(res.attribution);
        }
      }
    }
    return data;
  });

  await syncGalleryMetadataFromIndex(snakeId);

  // 4. Clean up entire candidates directory
  await cleanupCandidates(snakeId);
  console.log(`[commit] ${snakeId}: committed ${selections.length} selections, candidates cleaned up`);
}
