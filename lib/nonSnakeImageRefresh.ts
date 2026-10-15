/**
 * Non-snake image sourcing: search (Wikimedia + iNaturalist + GBIF), download candidates,
 * set thumbnail. Mirrors snake imageRefresh flow for the rankings UI.
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import sharp from "sharp";
import {
  searchSnakeImagesAllSources,
  searchWikimediaCommons,
  searchINaturalist,
  searchGBIF,
  downloadBestCandidate,
  downloadImage,
  type ImageAttribution,
} from "@/scripts/sourceSnakeImages";
import { resizeImage } from "@/scripts/imageProcessing";

const ROOT = process.cwd();
const DATA_PATH = join(ROOT, "data/non-snakes.json");
const IMAGES_BASE = join(ROOT, "public/images/non-snakes");
const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 225;
const CANDIDATE_COUNT = 10;

export interface NonSnakeCandidateEntry {
  index: number;
  src: string;
  source: string;
  score: number;
  attribution: ImageAttribution;
}

interface NonSnakeEntry {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  category: string;
  emoji: string;
  venomPotency: { ld50Normalized: number };
  venomTypes?: string[];
  description: string;
  continent: string;
  images?: { thumbnail: string };
}

function candidatesDir(id: string) {
  return join(IMAGES_BASE, id, "candidates");
}

function metadataPath(id: string) {
  return join(candidatesDir(id), "metadata.json");
}

async function atomicWrite(targetPath: string, data: Buffer | string) {
  const dir = dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, targetPath);
}

/** Get existing candidates from metadata (if any). */
export async function getNonSnakeCandidates(
  id: string
): Promise<NonSnakeCandidateEntry[]> {
  try {
    const content = await fs.readFile(metadataPath(id), "utf-8");
    return JSON.parse(content) as NonSnakeCandidateEntry[];
  } catch {
    return [];
  }
}

/** Search sources and download up to 10 candidates; save to candidates dir and return entries. */
export async function searchAndDownloadNonSnakeCandidates(
  id: string
): Promise<NonSnakeCandidateEntry[]> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const data: NonSnakeEntry[] = JSON.parse(raw);
  const entry = data.find((e) => e.id === id);
  if (!entry) throw new Error("Non-snake not found");

  const result = await searchSnakeImagesAllSources(entry.scientificName);
  if (result.combined.length === 0) throw new Error("No image candidates found");

  const dir = candidatesDir(id);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ok */
  }
  await fs.mkdir(dir, { recursive: true });

  const toTry = result.combined.slice(0, 18);
  const entries: NonSnakeCandidateEntry[] = [];

  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    const candidate = toTry[i];
    if (!candidate) break;
    const originalPath = join(dir, `original-${i}.jpg`);
    const dlResult = await downloadImage(candidate.url, originalPath);
    if (dlResult !== true) continue;

    const buffer = await fs.readFile(originalPath);
    const thumbPath = join(dir, `thumb-${i}.jpg`);
    await sharp(buffer)
      .resize(200, 150, { fit: "cover", position: "center" })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    entries.push({
      index: i,
      src: `/images/non-snakes/${id}/candidates/thumb-${i}.jpg`,
      source: candidate.attribution.source,
      score: Math.round(candidate.score),
      attribution: candidate.attribution,
    });
  }

  if (entries.length === 0) throw new Error("Failed to download any candidates");
  await atomicWrite(metadataPath(id), JSON.stringify(entries, null, 2));
  return entries;
}

/** Set thumbnail from a candidate index; update data/non-snakes.json. */
export async function setNonSnakeThumbnail(
  id: string,
  candidateIndex: number
): Promise<{ thumbnail: string }> {
  const meta = await getNonSnakeCandidates(id);
  const entry = meta.find((e) => e.index === candidateIndex);
  if (!entry) throw new Error(`Candidate ${candidateIndex} not found`);

  const dir = candidatesDir(id);
  const originalPath = join(dir, `original-${candidateIndex}.jpg`);
  const outDir = join(IMAGES_BASE, id);
  await fs.mkdir(outDir, { recursive: true });
  const thumbPath = join(outDir, "thumbnail.jpg");

  await resizeImage(originalPath, thumbPath, THUMB_WIDTH, THUMB_HEIGHT, "cover");

  const thumbnail = `/images/non-snakes/${id}/thumbnail.jpg`;
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const data: NonSnakeEntry[] = JSON.parse(raw);
  const updatedData = data.map((e) =>
    e.id === id ? { ...e, images: { thumbnail } } : e
  );
  await fs.writeFile(DATA_PATH, JSON.stringify(updatedData, null, 2), "utf-8");

  return { thumbnail };
}

/** Single-shot refresh: pick best candidate and set as thumbnail (for CLI / simple refresh). */
export async function refreshNonSnakeImage(
  id: string
): Promise<{ success: true; thumbnail: string } | { success: false; error: string }> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const data: NonSnakeEntry[] = JSON.parse(raw);
  const entry = data.find((e) => e.id === id);
  if (!entry) {
    return { success: false, error: "Non-snake not found" };
  }

  const sourceResults = await searchSnakeImagesAllSources(entry.scientificName);
  let candidates = sourceResults.combined;
  if (candidates.length === 0) {
    return { success: false, error: "No image candidates found" };
  }

  let downloadResult = await downloadBestCandidate(candidates, id, 1);
  if (downloadResult && "tryAlternateSource" in downloadResult) {
    const [wiki, iNat, gbif] = await Promise.all([
      searchWikimediaCommons(entry.scientificName),
      searchINaturalist(entry.scientificName),
      searchGBIF(entry.scientificName),
    ]);
    const altCandidates = [...iNat, ...gbif, ...wiki].sort((a, b) => b.score - a.score);
    if (altCandidates.length > 0) {
      downloadResult = await downloadBestCandidate(altCandidates, id, 1);
    } else {
      downloadResult = null;
    }
  }

  if (!downloadResult || "tryAlternateSource" in downloadResult) {
    return { success: false, error: "Download failed (rate limit or no candidates)" };
  }

  const outDir = join(IMAGES_BASE, id);
  await fs.mkdir(outDir, { recursive: true });
  const thumbPath = join(outDir, "thumbnail.jpg");
  await resizeImage(
    downloadResult.imagePath,
    thumbPath,
    THUMB_WIDTH,
    THUMB_HEIGHT,
    "cover"
  );

  const thumbnail = `/images/non-snakes/${id}/thumbnail.jpg`;
  const updatedData = data.map((e) =>
    e.id === id ? { ...e, images: { thumbnail } } : e
  );
  await fs.writeFile(DATA_PATH, JSON.stringify(updatedData, null, 2), "utf-8");

  return { success: true, thumbnail };
}
