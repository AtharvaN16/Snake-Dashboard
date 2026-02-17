/**
 * Extract snake species from Reptile Database CSV export.
 * Run: bun run scripts/extractReptileDB.ts
 *
 * Fetches taxa.csv, filters for snake families, outputs data/snake-candidates.json
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPTILE_DB_CSV_URL =
  "http://reptile-database.reptarium.cz/interfaces/export/taxa.csv";

// Snake families (order Serpentes) - from Reptile Database taxonomy
const SNAKE_FAMILIES = new Set([
  "Acrochordidae",
  "Aniliidae",
  "Anomochilidae",
  "Boidae",
  "Bolyeriidae",
  "Colubridae",
  "Cylindrophiidae",
  "Elapidae",
  "Gerrhopilidae",
  "Homalopsidae",
  "Lamprophiidae",
  "Loxocemidae",
  "Pareidae",
  "Pythonidae",
  "Typhlopidae",
  "Viperidae",
  "Xenodermidae",
  "Xenopeltidae",
  "Xenophidiidae",
  "Leptotyphlopidae",
  "Anomalepididae",
  "Sibynophiidae",
  "Natricidae",
  "Pseudaspididae",
  "Pseudoxyrhophiidae",
  "Dipsadidae",
  "Prosymnidae",
]);

interface SnakeCandidate {
  taxonId: string;
  family: string;
  genus: string;
  species: string;
  scientificName: string;
  subspecies?: string;
}

async function main() {
  console.log("Fetching Reptile Database taxa CSV...");
  const response = await fetch(REPTILE_DB_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const csv = await response.text();

  const lines = csv.split("\n");
  const header = lines[0];
  const headers = header.split(";").map((h) => h.trim());

  const familyIdx = headers.indexOf("family");
  const genusIdx = headers.indexOf("genus");
  const speciesIdx = headers.indexOf("specific_epithet");
  const taxonIdIdx = headers.indexOf("taxon_id");
  const infraspecificIdx = headers.indexOf("infraspecific_epithet");
  const infraspecificMarkerIdx = headers.indexOf("infraspecific_marker");

  if (familyIdx < 0 || genusIdx < 0 || speciesIdx < 0) {
    throw new Error("Expected columns not found in CSV");
  }

  const snakes: SnakeCandidate[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split(";");
    const family = (cols[familyIdx] || "").trim();
    const genus = (cols[genusIdx] || "").trim();
    const species = (cols[speciesIdx] || "").trim();
    const infraspecific = infraspecificIdx >= 0 ? (cols[infraspecificIdx] || "").trim() : "";
    const hasSubspecies = infraspecificMarkerIdx >= 0 && (cols[infraspecificMarkerIdx] || "").trim() === "subsp.";

    if (!SNAKE_FAMILIES.has(family)) continue;
    if (!genus || !species) continue;

    // Keep only species-level entries (exclude subspecies for cleaner list)
    if (hasSubspecies) continue;

    const scientificName = `${genus} ${species}`;

    snakes.push({
      taxonId: (cols[taxonIdIdx] || "").trim() || `${genus}_${species}`,
      family,
      genus,
      species,
      scientificName,
    });
  }

  const outputPath = join(__dirname, "../data/snake-candidates.json");
  const output = {
    source: "Reptile Database",
    url: "http://www.reptile-database.org",
    extractedAt: new Date().toISOString(),
    totalSnakes: snakes.length,
    byFamily: {} as Record<string, number>,
    snakes,
  };

  snakes.forEach((s) => {
    output.byFamily[s.family] = (output.byFamily[s.family] || 0) + 1;
  });

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Extracted ${snakes.length} snake species.`);
  console.log("By family:", output.byFamily);
  console.log(`Wrote to data/snake-candidates.json`);
}

main().catch(console.error);
