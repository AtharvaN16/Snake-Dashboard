/**
 * API integration for sourcing snake images from Wikimedia Commons and iNaturalist
 */

import { promises as fs } from "fs";
import { join } from "path";

export interface ImageAttribution {
  photographer?: string;
  source: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}

export interface ImageCandidate {
  url: string;
  width: number;
  height: number;
  attribution: ImageAttribution;
  score: number; // Quality score for ranking
}

export interface SourceSearchResult {
  wikimedia: ImageCandidate[];
  iNaturalist: ImageCandidate[];
  gbif: ImageCandidate[];
  combined: ImageCandidate[];
}

/** Result of a single image download attempt */
export type DownloadResult = true | false | "rate-limited";

/**
 * Download an image from URL to local path.
 * Returns true on success, false on other errors, 'rate-limited' when server returns 429.
 */
export async function downloadImage(
  url: string,
  outputPath: string
): Promise<DownloadResult> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SnakeDashboard/1.0 (Educational Project)" },
      redirect: "follow",
    });

    if (response.status === 429) {
      console.error(`Failed to download: 429 (rate limited)`);
      return "rate-limited";
    }

    if (!response.ok) {
      console.error(`Failed to download: ${response.status}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return true;
  } catch (error) {
    console.error("Download error:", error);
    return false;
  }
}

/**
 * Search Wikimedia Commons for images of a snake species
 */
export async function searchWikimediaCommons(
  scientificName: string
): Promise<ImageCandidate[]> {
  const candidates: ImageCandidate[] = [];
  
  try {
    // Search using Wikimedia Commons API
    const searchQuery = encodeURIComponent(scientificName);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${searchQuery}&gsrlimit=20&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1200`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.query || !data.query.pages) {
      return candidates;
    }

    for (const page of Object.values(data.query.pages) as any[]) {
      if (!page.imageinfo || !page.imageinfo[0]) continue;

      const info = page.imageinfo[0];
      const metadata = info.extmetadata || {};

      // Extract license information
      const licenseShortName = metadata.LicenseShortName?.value || "";
      const licenseUrl = metadata.LicenseUrl?.value || "";
      
      // Accept CC0, CC-BY, CC-BY-SA, and CC-BY-NC variants (educational project)
      const acceptableLicenses = ["CC0", "CC BY", "CC-BY", "CC BY-SA", "CC-BY-SA", "CC BY-NC", "CC-BY-NC"];
      const isAcceptableLicense = acceptableLicenses.some(license =>
        licenseShortName.includes(license)
      );

      if (!isAcceptableLicense) continue;

      // Check dimensions — allow smaller images
      const width = info.width || 0;
      const height = info.height || 0;

      if (width < 400) continue; // Minimum usable threshold

      // Calculate quality score with preference for full-body shots
      const aspectRatio = width / height;
      
      // Check for full-body indicators in description
      const description = (metadata.ImageDescription?.value || "").toLowerCase();
      const hasFullBodyKeyword = description.includes("full") || 
                                 description.includes("entire") || 
                                 description.includes("whole");
      
      // Wide shots are more likely to be full-body
      const isLikelyFullBody = aspectRatio > 1.2 && aspectRatio < 2.5;
      const hasFullBody = hasFullBodyKeyword || isLikelyFullBody;
      
      // Quality score calculation (max 100 points)
      const sizeScore = Math.min(width / 2000, 1) * 40; // Max 40 points for size
      const aspectScore = (aspectRatio > 1.2 && aspectRatio < 2.5) ? 30 : 15; // 30 for good aspect ratio
      const fullBodyBonus = hasFullBody ? 20 : 0; // 20 bonus points for full-body
      const score = sizeScore + aspectScore + fullBodyBonus;

      candidates.push({
        url: info.thumburl || info.url,
        width,
        height,
        attribution: {
          photographer: metadata.Artist?.value?.replace(/<[^>]*>/g, "") || "Unknown",
          source: "Wikimedia Commons",
          sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${page.title}`,
          license: licenseShortName,
          licenseUrl: licenseUrl || "https://creativecommons.org/licenses/",
        },
        score,
      });
    }
  } catch (error) {
    console.error("Wikimedia Commons API error:", error);
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Search iNaturalist for images of a snake species
 */
export async function searchINaturalist(
  scientificName: string
): Promise<ImageCandidate[]> {
  const candidates: ImageCandidate[] = [];
  
  try {
    // First, search for the taxon
    const taxonQuery = encodeURIComponent(scientificName);
    const taxonUrl = `https://api.inaturalist.org/v1/taxa?q=${taxonQuery}&rank=species`;
    
    let taxonResponse;
    try {
      taxonResponse = await fetch(taxonUrl, {
        headers: {
          "User-Agent": "SnakeDashboard/1.0 (Educational Project)",
        },
      });
    } catch (e) {
      console.error(`[iNaturalist] Taxon fetch failed for "${scientificName}":`, e);
      return candidates;
    }

    if (!taxonResponse.ok) {
      console.error(`[iNaturalist] API error ${taxonResponse.status} for "${scientificName}"`);
      return candidates;
    }

    const taxonData = await taxonResponse.json();

    if (!taxonData.results || taxonData.results.length === 0) {
      console.log(`[iNaturalist] No taxon match for "${scientificName}"`);
      return candidates;
    }

    const taxonId = taxonData.results[0].id;
    console.log(`[iNaturalist] Matched taxon "${taxonData.results[0].name}" (ID: ${taxonId})`);

    // Get observations with photos
    const obsUrl = `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&quality_grade=research&photos=true&per_page=20&order=desc&order_by=votes`;
    
    const obsResponse = await fetch(obsUrl, {
      headers: {
        "User-Agent": "SnakeDashboard/1.0 (Educational Project)",
      },
    });
    const obsData = await obsResponse.json();

    if (!obsData.results) {
      console.log(`[iNaturalist] No observations found for taxon ${taxonId}`);
      return candidates;
    }

    console.log(`[iNaturalist] Found ${obsData.results.length} observations for taxon ${taxonId}`);

    for (const obs of obsData.results) {
      if (!obs.photos || obs.photos.length === 0) continue;

      const photo = obs.photos[0];
      
      // iNaturalist photos are typically CC-BY-NC or CC0
      const license = photo.license_code || "all-rights-reserved";
      
      // Accept open + non-commercial licenses (educational project)
      const acceptableLicenses = ["cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa"];
      if (!acceptableLicenses.includes(license.toLowerCase())) {
        // console.log(`[iNaturalist] Skipping photo with license: ${license}`);
        continue;
      }

      // Use large size
      const url = photo.url.replace("square", "large");

      // Estimate dimensions (large is typically 1024px)
      const width = 1024;
      const height = 1024;

      const licenseMap: Record<string, { name: string; url: string }> = {
        "cc0": { name: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
        "cc-by": { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
        "cc-by-sa": { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
        "cc-by-nc": { name: "CC BY-NC 4.0", url: "https://creativecommons.org/licenses/by-nc/4.0/" },
        "cc-by-nc-sa": { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
      };

      const licenseInfo = licenseMap[license.toLowerCase()] || { name: license, url: "" };

      candidates.push({
        url,
        width,
        height,
        attribution: {
          photographer: obs.user?.name || obs.user?.login || "iNaturalist User",
          source: "iNaturalist",
          sourceUrl: `https://www.inaturalist.org/observations/${obs.id}`,
          license: licenseInfo.name,
          licenseUrl: licenseInfo.url,
        },
        score: 60 + (obs.faves_count || 0) / 10, // Base score + popularity
      });
    }
  } catch (error) {
    console.error("iNaturalist API error:", error);
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Search GBIF for occurrence images of a species.
 * GBIF provides biodiversity-grade occurrence records and media links.
 */
export async function searchGBIF(
  scientificName: string
): Promise<ImageCandidate[]> {
  const candidates: ImageCandidate[] = [];

  try {
    const encodedName = encodeURIComponent(scientificName);

    // 1) Match the scientific name to a GBIF taxon key.
    const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodedName}`;
    const matchResponse = await fetch(matchUrl);
    const matchData = await matchResponse.json();
    const taxonKey = matchData.usageKey;

    if (!taxonKey) {
      return candidates;
    }

    // 2) Fetch occurrences with still images for this taxon.
    const occUrl = `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&mediaType=StillImage&limit=25`;
    const occResponse = await fetch(occUrl);
    const occData = await occResponse.json();

    if (!occData.results || !Array.isArray(occData.results)) {
      return candidates;
    }

    for (const occ of occData.results as any[]) {
      const mediaItems = Array.isArray(occ.media) ? occ.media : [];
      if (mediaItems.length === 0) continue;

      // Pick the best usable media item from this occurrence.
      const media = mediaItems.find(
        (m: any) =>
          typeof m.identifier === "string" &&
          m.identifier.startsWith("http") &&
          (!m.type || String(m.type).toLowerCase().includes("image"))
      );
      if (!media) continue;

      const rawLicense = String(media.license || occ.license || "").trim();
      const normalizedLicense = rawLicense.toLowerCase();
      const acceptable =
        normalizedLicense.includes("cc0") ||
        normalizedLicense.includes("publicdomain/zero") ||
        normalizedLicense.includes("cc by") ||
        normalizedLicense.includes("cc-by") ||
        normalizedLicense.includes("creativecommons.org/licenses/by") ||
        normalizedLicense.includes("cc by-sa") ||
        normalizedLicense.includes("cc-by-sa") ||
        normalizedLicense.includes("cc by-nc") ||
        normalizedLicense.includes("cc-by-nc") ||
        normalizedLicense.includes("creativecommons.org/licenses/by-nc");
      if (!acceptable) continue;

      const width = Number(media.width || 0);
      const height = Number(media.height || 0);
      const aspectRatio = height > 0 ? width / height : 1;

      // Conservative scoring for GBIF media when dimensions are often missing.
      const sizeScore = width > 0 ? Math.min(width / 2000, 1) * 30 : 15;
      const aspectScore = aspectRatio > 1.1 && aspectRatio < 2.8 ? 20 : 10;
      const score = 45 + sizeScore + aspectScore;

      candidates.push({
        url: media.identifier,
        width: width || 1024,
        height: height || 768,
        attribution: {
          photographer:
            media.creator ||
            occ.recordedBy ||
            occ.identifiedBy ||
            "GBIF Contributor",
          source: "GBIF",
          sourceUrl:
            occ.key != null
              ? `https://www.gbif.org/occurrence/${occ.key}`
              : "https://www.gbif.org/",
          license: rawLicense || "CC",
          licenseUrl:
            rawLicense.startsWith("http") && rawLicense.includes("creativecommons.org")
              ? rawLicense
              : "https://www.gbif.org/",
        },
        score,
      });
    }
  } catch (error) {
    console.error("GBIF API error:", error);
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Search for snake images across all sources
 */
export async function searchSnakeImages(
  scientificName: string
): Promise<ImageCandidate[]> {
  console.log(`Searching for images of ${scientificName}...`);
  
  // Try Wikimedia Commons first
  let candidates = await searchWikimediaCommons(scientificName);
  
  if (candidates.length > 0) {
    console.log(`✓ Found ${candidates.length} candidates from Wikimedia Commons`);
    return candidates;
  }

  // Fallback to iNaturalist
  console.log("No suitable images on Wikimedia Commons, trying iNaturalist...");
  candidates = await searchINaturalist(scientificName);
  
  if (candidates.length > 0) {
    console.log(`✓ Found ${candidates.length} candidates from iNaturalist`);
    return candidates;
  }

  // Fallback to GBIF
  console.log("No suitable images on iNaturalist, trying GBIF...");
  candidates = await searchGBIF(scientificName);

  if (candidates.length > 0) {
    console.log(`✓ Found ${candidates.length} candidates from GBIF`);
  } else {
    console.log(`✗ No suitable images found for ${scientificName}`);
  }
  
  return candidates;
}

/**
 * Search both sources and return source-separated plus combined candidates.
 * Combined candidates are deduplicated by image URL and sorted by score.
 */
export async function searchSnakeImagesAllSources(
  scientificName: string
): Promise<SourceSearchResult> {
  console.log(`[sourceSnakeImages] Searching all sources for: "${scientificName}"`);

  const [wikimedia, iNaturalist, gbif] = await Promise.all([
    searchWikimediaCommons(scientificName),
    searchINaturalist(scientificName),
    searchGBIF(scientificName),
  ]);

  console.log(`[sourceSnakeImages] Raw results for "${scientificName}": Wiki=${wikimedia.length}, iNat=${iNaturalist.length}, GBIF=${gbif.length}`);

  const deduped = new Map<string, ImageCandidate>();
  for (const candidate of [...wikimedia, ...iNaturalist, ...gbif]) {
    const existing = deduped.get(candidate.url);
    if (!existing || candidate.score > existing.score) {
      deduped.set(candidate.url, candidate);
    }
  }

  const combined = Array.from(deduped.values()).sort((a, b) => b.score - a.score);

  console.log(
    `✓ Combined results for "${scientificName}": ${combined.length} unique candidates`
  );

  return { wikimedia, iNaturalist, gbif, combined };
}

/** Result of downloadBestCandidate: success, rate-limited (try other source), or failed */
export type DownloadBestResult =
  | { imagePath: string; attribution: ImageAttribution }
  | { tryAlternateSource: true }
  | null;

/**
 * Download and save the best image candidate (returns top 5 for gallery support).
 * Returns tryAlternateSource when server returns 429 so caller can try another source (e.g. iNaturalist).
 */
export async function downloadBestCandidate(
  candidates: ImageCandidate[],
  snakeId: string,
  maxCandidates: number = 5
): Promise<DownloadBestResult> {
  if (candidates.length === 0) {
    return null;
  }

  const tempDir = join(__dirname, "../temp");
  await fs.mkdir(tempDir, { recursive: true });

  let sawRateLimit = false;

  for (let i = 0; i < Math.min(maxCandidates, candidates.length); i++) {
    const candidate = candidates[i];
    const tempPath = join(tempDir, `${snakeId}-candidate-${i}.jpg`);

    console.log(`Attempting to download candidate ${i + 1}...`);
    const result = await downloadImage(candidate.url, tempPath);

    if (result === true) {
      console.log(`✓ Downloaded image for ${snakeId}`);
      return {
        imagePath: tempPath,
        attribution: candidate.attribution,
      };
    }
    if (result === "rate-limited") {
      sawRateLimit = true;
    }
  }

  if (sawRateLimit) {
    console.error(`Rate limited; try another source (e.g. iNaturalist) for ${snakeId}`);
    return { tryAlternateSource: true };
  }

  console.error(`Failed to download any candidates for ${snakeId}`);
  return null;
}

/**
 * Save attribution metadata to JSON file
 */
export async function saveAttribution(
  snakeId: string,
  attribution: ImageAttribution
): Promise<void> {
  const attributionPath = join(
    __dirname,
    "../public/images/snakes",
    snakeId,
    "attribution.json"
  );

  await fs.writeFile(
    attributionPath,
    JSON.stringify(attribution, null, 2),
    "utf-8"
  );
}

/**
 * Load attribution metadata from JSON file
 */
export async function loadAttribution(
  snakeId: string
): Promise<ImageAttribution | null> {
  const attributionPath = join(
    __dirname,
    "../public/images/snakes",
    snakeId,
    "attribution.json"
  );

  try {
    const content = await fs.readFile(attributionPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Add delay between API requests to respect rate limits
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download multiple images for snake gallery
 * Returns array of downloaded image paths with attributions
 */
export async function downloadGalleryImages(
  candidates: ImageCandidate[],
  snakeId: string,
  maxImages: number = 3
): Promise<Array<{ path: string; attribution: ImageAttribution }>> {
  const galleryDir = join(__dirname, "../public/images/snakes", snakeId, "gallery");
  await fs.mkdir(galleryDir, { recursive: true });
  
  const downloaded: Array<{ path: string; attribution: ImageAttribution }> = [];
  
  // Candidates are expected to be gallery-ready and exclude the primary image.
  for (let i = 0; i < Math.min(maxImages, candidates.length); i++) {
    const candidate = candidates[i];
    const imageNumber = i + 1;
    const imagePath = join(galleryDir, `${imageNumber}.jpg`);
    
    console.log(`  Downloading gallery image ${imageNumber} (${candidate.attribution.source})...`);
    const downloadResult = await downloadImage(candidate.url, imagePath);
    
    if (downloadResult === true) {
      downloaded.push({
        path: `/images/snakes/${snakeId}/gallery/${imageNumber}.jpg`,
        attribution: candidate.attribution,
      });
    }
  }
  
  return downloaded;
}

/**
 * Build a diverse gallery selection from combined candidates.
 * Tries to include sources different from the primary first, then fills remaining slots by score.
 */
export function selectDiverseGalleryCandidates(
  combinedCandidates: ImageCandidate[],
  primaryAttribution: ImageAttribution,
  maxImages: number = 3
): ImageCandidate[] {
  if (combinedCandidates.length === 0 || maxImages <= 0) {
    return [];
  }

  // Exclude the exact primary source entry when possible.
  const filtered = combinedCandidates.filter(
    (c) => c.attribution.sourceUrl !== primaryAttribution.sourceUrl
  );

  const bySource = new Map<string, ImageCandidate[]>();
  for (const candidate of filtered) {
    const source = candidate.attribution.source;
    const list = bySource.get(source) || [];
    list.push(candidate);
    bySource.set(source, list);
  }

  for (const list of bySource.values()) {
    list.sort((a, b) => b.score - a.score);
  }

  const selected: ImageCandidate[] = [];
  const selectedUrls = new Set<string>();
  const primarySource = primaryAttribution.source;

  // First pass: prefer non-primary sources to increase source diversity.
  const nonPrimarySources = Array.from(bySource.keys()).filter((s) => s !== primarySource);
  for (const source of nonPrimarySources) {
    if (selected.length >= maxImages) break;
    const list = bySource.get(source);
    const candidate = list?.shift();
    if (candidate && !selectedUrls.has(candidate.url)) {
      selected.push(candidate);
      selectedUrls.add(candidate.url);
    }
  }

  // Second pass: fill remaining slots by score across all remaining candidates.
  if (selected.length < maxImages) {
    const remaining = Array.from(bySource.values())
      .flat()
      .sort((a, b) => b.score - a.score);

    for (const candidate of remaining) {
      if (selected.length >= maxImages) break;
      if (selectedUrls.has(candidate.url)) continue;
      selected.push(candidate);
      selectedUrls.add(candidate.url);
    }
  }

  return selected;
}

/**
 * Save gallery metadata to JSON file
 */
export async function saveGalleryMetadata(
  snakeId: string,
  galleryImages: Array<{ path: string; attribution: ImageAttribution }>
): Promise<void> {
  const galleryMetaPath = join(
    __dirname,
    "../public/images/snakes",
    snakeId,
    "gallery-metadata.json"
  );

  const metadata = {
    images: galleryImages.map(img => img.path),
    attributions: galleryImages.map(img => img.attribution),
  };

  await fs.writeFile(
    galleryMetaPath,
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
}

/**
 * Load gallery metadata from JSON file
 */
export async function loadGalleryMetadata(
  snakeId: string
): Promise<{ images: string[]; attributions: ImageAttribution[] } | null> {
  const galleryMetaPath = join(
    __dirname,
    "../public/images/snakes",
    snakeId,
    "gallery-metadata.json"
  );

  try {
    const content = await fs.readFile(galleryMetaPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
