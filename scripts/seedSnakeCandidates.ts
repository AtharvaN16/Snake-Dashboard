/**
 * Generate skeleton snake entries from Reptile DB candidates for curation.
 * Run: bun run scripts/seedSnakeCandidates.ts
 *
 * Picks species by family to reach target mix. Outputs JSON that can be
 * merged into data/snakes/index.json after manual enrichment.
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import candidates from "../data/snake-candidates.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TARGET = 100;
const VENOMOUS_FAMILIES = ["Elapidae", "Viperidae"];
const CONSTRICTOR_FAMILIES = ["Boidae", "Pythonidae"];
const COMMON_FAMILIES = ["Colubridae", "Natricidae"];

interface Candidate {
  taxonId: string;
  family: string;
  genus: string;
  species: string;
  scientificName: string;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function createSkeleton(c: Candidate, classification: string): object {
  const id = slugify(c.genus + "-" + c.species);
  const commonName = c.genus.charAt(0) + c.genus.slice(1).toLowerCase() + " " + c.species;

  const base = {
    id,
    commonName,
    scientificName: c.scientificName,
    family: c.family,
    genus: c.genus,
    dangerScore: classification === "Non-venomous" ? 0 : 50,
    dangerRank: classification === "Non-venomous" ? "N/A" : "?/100",
    venomClassification: classification,
    humanEncounterChance: "Moderate" as const,
    distribution: {
      regions: ["TBD"],
      habitat: "TBD",
    },
    images: {
      primary: `/images/snakes/${id}-primary.jpg`,
      thumbnail: `/images/snakes/${id}-thumb.jpg`,
      attribution: { source: "Placeholder", license: "CC BY 4.0", url: "https://placeholder.com" },
    },
    description: "TBD",
    sources: ["Reptile Database", "Wikipedia"],
  };

  if (classification === "Non-venomous") {
    return {
      ...base,
      ...(CONSTRICTOR_FAMILIES.includes(c.family) && {
        constrictor: true,
        maxLength: { value: 2, unit: "m" as const },
        diet: ["TBD"],
      }),
    };
  }

  return {
    ...base,
    dangerScoreComponents: {
      potencyScore: 50,
      yieldScore: 50,
      lethalityScore: 50,
      clinicalScore: 50,
      encounterScore: 50,
      speedScore: 50,
    },
    venomPotency: { ld50: 1, ld50Range: "TBD", unit: "mg/kg", method: "IV" as const },
    venomYield: { qualitative: "Moderate" as const },
    venomTypes: ["Neurotoxic" as const],
    venomSpeed: "Quick" as const,
    symptomsProgression: {
      shortTerm: ["TBD"],
      progressive: ["TBD"],
      critical: ["TBD"],
    },
  };
}

async function main() {
  const snakes = candidates.snakes as Candidate[];
  const needed = TARGET - 9; // 9 already in index.json

  const venomous = snakes.filter((s) => VENOMOUS_FAMILIES.includes(s.family));
  const constrictors = snakes.filter((s) => CONSTRICTOR_FAMILIES.includes(s.family));
  const common = snakes.filter((s) => COMMON_FAMILIES.includes(s.family));

  const count = Math.floor(needed / 4);
  const picks = [
    ...venomous.slice(0, count).map((c) => createSkeleton(c, "Highly Venomous")),
    ...constrictors.slice(0, count).map((c) => createSkeleton(c, "Non-venomous")),
    ...common.slice(0, count * 2).map((c) => createSkeleton(c, "Non-venomous")),
  ].slice(0, needed);

  const output = {
    note: "Skeleton entries for manual enrichment. Merge into data/snakes/index.json.",
    count: picks.length,
    snakes: picks,
  };

  writeFileSync(
    join(__dirname, "../data/snake-skeletons.json"),
    JSON.stringify(output, null, 2)
  );
  console.log(`Generated ${picks.length} skeleton entries → data/snake-skeletons.json`);
}

main().catch(console.error);
