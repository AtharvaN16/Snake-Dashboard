/**
 * Region-first curation pass for famous snakes.
 * Run: bun run scripts/curateRegionalSnakes.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania"
  | "Antarctica";

type SnakeRecord = Record<string, unknown> & {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  venomClassification: string;
  humanEncounterChance: "Low" | "Moderate" | "High" | "Very High";
  distribution: { regions: string[]; habitat: string; coordinates?: Array<{ lat: number; lng: number }> };
};

const DATA_PATH = join(process.cwd(), "data/snakes/index.json");

function inferContinent(regions: string[]): Continent {
  const text = regions.join(" ").toLowerCase();
  if (/(australia|new guinea|oceania|tasmania|new zealand|melanesia)/.test(text)) return "Oceania";
  if (/(north america|united states|canada|mexico|caribbean|central america)/.test(text)) return "North America";
  if (/(south america|brazil|argentina|peru|colombia|bolivia|ecuador|chile|paraguay|uruguay|venezuela)/.test(text)) return "South America";
  if (/(africa|saharan|congo|egypt|morocco|nigeria|kenya|south africa|madagascar)/.test(text)) return "Africa";
  if (/(europe|mediterranean|spain|france|italy|greece|balkan|uk|germany)/.test(text)) return "Europe";
  if (/(asia|india|china|japan|southeast asia|indonesia|philippines|middle east|arabian)/.test(text)) return "Asia";
  return "Asia";
}

function baseVenomous(
  snake: Omit<SnakeRecord, "venomClassification"> & {
    continent: Continent;
    subregions: string[];
    venomClassification: "Highly Venomous" | "Moderately Venomous" | "Mildly Venomous";
    dangerScore: number;
    venomTypes?: string[];
  }
): SnakeRecord {
  return {
    ...snake,
    dangerRank: "Regional",
    dangerScoreComponents: {
      potencyScore: 70,
      yieldScore: 60,
      lethalityScore: 65,
      clinicalScore: 50,
      encounterScore: 55,
      speedScore: 50,
    },
    venomPotency: { ld50: 1, ld50Range: "Varies", unit: "mg/kg", method: "IV" },
    venomYield: { qualitative: "Moderate" },
    venomTypes: snake.venomTypes ?? ["Neurotoxic"],
    venomSpeed: "Quick",
    symptomsProgression: {
      shortTerm: ["Localized pain", "Nausea"],
      progressive: ["Systemic envenomation symptoms"],
      critical: ["Severe untreated envenomation can be life-threatening"],
    },
    images: {
      primary: `/images/snakes/${snake.id}-primary.jpg`,
      thumbnail: `/images/snakes/${snake.id}-thumb.jpg`,
      attribution: { source: "Placeholder", license: "CC BY 4.0", url: "https://placeholder.com" },
    },
    sources: ["WHO", "Reptile Database", "Wikipedia"],
  };
}

function baseNonVenomous(
  snake: Omit<SnakeRecord, "venomClassification"> & {
    continent: Continent;
    subregions: string[];
    dangerScore?: number;
    constrictor?: boolean;
    maxLength?: { value: number; unit: "cm" | "m" };
    diet?: string[];
  }
): SnakeRecord {
  return {
    ...snake,
    dangerScore: snake.dangerScore ?? 0,
    dangerRank: "N/A",
    venomClassification: "Non-venomous",
    images: {
      primary: `/images/snakes/${snake.id}-primary.jpg`,
      thumbnail: `/images/snakes/${snake.id}-thumb.jpg`,
      attribution: { source: "Placeholder", license: "CC BY 4.0", url: "https://placeholder.com" },
    },
    sources: ["Reptile Database", "Wikipedia"],
  };
}

const curatedAdditions: SnakeRecord[] = [
  // Asia
  baseVenomous({ id: "monocled-cobra", commonName: "Monocled Cobra", scientificName: "Naja kaouthia", family: "Elapidae", genus: "Naja", continent: "Asia", subregions: ["South Asia", "Southeast Asia"], dangerScore: 82, venomClassification: "Highly Venomous", humanEncounterChance: "High", distribution: { regions: ["South Asia", "Southeast Asia"], habitat: "Agricultural fields, forests, villages" }, description: "One of Asia's most recognized cobras, common in snakebite regions." }),
  baseVenomous({ id: "common-krait", commonName: "Common Krait", scientificName: "Bungarus caeruleus", family: "Elapidae", genus: "Bungarus", continent: "Asia", subregions: ["Indian Subcontinent"], dangerScore: 86, venomClassification: "Highly Venomous", humanEncounterChance: "High", distribution: { regions: ["India", "Pakistan", "Bangladesh", "Sri Lanka"], habitat: "Rural settlements and fields" }, description: "Iconic nocturnal krait and major medically important species in South Asia." }),
  baseVenomous({ id: "banded-krait", commonName: "Banded Krait", scientificName: "Bungarus fasciatus", family: "Elapidae", genus: "Bungarus", continent: "Asia", subregions: ["Southeast Asia"], dangerScore: 72, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Southeast Asia"], habitat: "Grasslands, wetlands, forests" }, description: "Highly recognizable black-yellow banded krait." }),
  baseVenomous({ id: "asian-vine-snake", commonName: "Asian Vine Snake", scientificName: "Ahaetulla prasina", family: "Colubridae", genus: "Ahaetulla", continent: "Asia", subregions: ["Southeast Asia"], dangerScore: 25, venomClassification: "Mildly Venomous", venomTypes: ["Hemotoxic"], humanEncounterChance: "Moderate", distribution: { regions: ["Southeast Asia"], habitat: "Forest edges, gardens, shrubs" }, description: "Famous green arboreal snake; mild rear-fanged venom." }),
  baseVenomous({ id: "javan-spitting-cobra", commonName: "Javan Spitting Cobra", scientificName: "Naja sputatrix", family: "Elapidae", genus: "Naja", continent: "Asia", subregions: ["Indonesia"], dangerScore: 74, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Indonesia"], habitat: "Lowland forests and cultivated areas" }, description: "Well-known Southeast Asian spitting cobra." }),

  // Africa
  baseVenomous({ id: "green-mamba", commonName: "Eastern Green Mamba", scientificName: "Dendroaspis angusticeps", family: "Elapidae", genus: "Dendroaspis", continent: "Africa", subregions: ["East Africa"], dangerScore: 79, venomClassification: "Highly Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["East Africa"], habitat: "Coastal forests and dense vegetation" }, description: "Highly recognizable arboreal mamba from East Africa." }),
  baseVenomous({ id: "boomslang-southern", commonName: "Southern Boomslang", scientificName: "Dispholidus typus", family: "Colubridae", genus: "Dispholidus", continent: "Africa", subregions: ["Sub-Saharan Africa"], dangerScore: 68, venomClassification: "Moderately Venomous", humanEncounterChance: "Low", distribution: { regions: ["Sub-Saharan Africa"], habitat: "Savanna woodland and shrubland" }, description: "Famous rear-fanged species with clinically important venom." }),
  baseVenomous({ id: "egyptian-viper", commonName: "Horned Desert Viper", scientificName: "Cerastes cerastes", family: "Viperidae", genus: "Cerastes", continent: "Africa", subregions: ["North Africa"], dangerScore: 63, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["North Africa"], habitat: "Deserts and dune systems" }, description: "Iconic horned desert viper seen across documentaries and references." }),

  // Europe
  baseVenomous({ id: "common-adder", commonName: "Common European Adder", scientificName: "Vipera berus", family: "Viperidae", genus: "Vipera", continent: "Europe", subregions: ["Northern Europe", "Central Europe"], dangerScore: 50, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Europe"], habitat: "Heathlands, forests, grasslands" }, description: "Most famous and widespread venomous snake in Europe." }),
  baseVenomous({ id: "asp-viper", commonName: "Asp Viper", scientificName: "Vipera aspis", family: "Viperidae", genus: "Vipera", continent: "Europe", subregions: ["Southern Europe"], dangerScore: 52, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Southern Europe"], habitat: "Rocky slopes, vineyards, scrubland" }, description: "Classic Mediterranean viper known throughout Europe." }),
  baseVenomous({ id: "nose-horned-viper", commonName: "Nose-horned Viper", scientificName: "Vipera ammodytes", family: "Viperidae", genus: "Vipera", continent: "Europe", subregions: ["Balkans", "Southern Europe"], dangerScore: 61, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Balkans", "Southern Europe"], habitat: "Rocky grasslands and dry scrub" }, description: "One of Europe's most recognizable vipers." }),
  baseVenomous({ id: "european-cat-snake", commonName: "European Cat Snake", scientificName: "Telescopus fallax", family: "Colubridae", genus: "Telescopus", continent: "Europe", subregions: ["Mediterranean"], dangerScore: 18, venomClassification: "Mildly Venomous", humanEncounterChance: "Low", distribution: { regions: ["Mediterranean Europe"], habitat: "Dry rocky habitats" }, description: "Mildly venomous rear-fanged species known in Mediterranean regions." }),

  // North America
  baseVenomous({ id: "timber-rattlesnake", commonName: "Timber Rattlesnake", scientificName: "Crotalus horridus", family: "Viperidae", genus: "Crotalus", continent: "North America", subregions: ["Eastern United States"], dangerScore: 69, venomClassification: "Highly Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Eastern United States"], habitat: "Deciduous forests and rocky hills" }, description: "One of the best-known rattlesnakes in North America." }),
  baseVenomous({ id: "prairie-rattlesnake", commonName: "Prairie Rattlesnake", scientificName: "Crotalus viridis", family: "Viperidae", genus: "Crotalus", continent: "North America", subregions: ["Great Plains", "Western United States"], dangerScore: 62, venomClassification: "Moderately Venomous", humanEncounterChance: "High", distribution: { regions: ["Great Plains", "Western United States"], habitat: "Prairies, grasslands, scrub" }, description: "Famous prairie species and frequent human encounter rattlesnake." }),
  baseVenomous({ id: "massasauga", commonName: "Eastern Massasauga", scientificName: "Sistrurus catenatus", family: "Viperidae", genus: "Sistrurus", continent: "North America", subregions: ["Great Lakes", "Midwest"], dangerScore: 54, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Great Lakes", "Midwest"], habitat: "Wet prairies and marshes" }, description: "Iconic small rattlesnake of the Great Lakes region." }),

  // South America
  baseVenomous({ id: "jararaca", commonName: "Jararaca", scientificName: "Bothrops jararaca", family: "Viperidae", genus: "Bothrops", continent: "South America", subregions: ["Brazil", "Paraguay", "Argentina"], dangerScore: 73, venomClassification: "Highly Venomous", humanEncounterChance: "High", distribution: { regions: ["Brazil", "Paraguay", "Argentina"], habitat: "Atlantic forest and agricultural margins" }, description: "Most recognized pit viper in Brazil and a major medical species." }),
  baseVenomous({ id: "south-american-rattlesnake", commonName: "South American Rattlesnake", scientificName: "Crotalus durissus", family: "Viperidae", genus: "Crotalus", continent: "South America", subregions: ["Brazil", "Bolivia", "Paraguay"], dangerScore: 71, venomClassification: "Highly Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["South America"], habitat: "Savanna and dry open habitats" }, description: "The best-known rattlesnake in South America." }),

  // Oceania
  baseVenomous({ id: "mulga-snake", commonName: "Mulga Snake (King Brown)", scientificName: "Pseudechis australis", family: "Elapidae", genus: "Pseudechis", continent: "Oceania", subregions: ["Australia"], dangerScore: 70, venomClassification: "Moderately Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Australia"], habitat: "Arid and semi-arid habitats" }, description: "Well-known large Australian elapid with significant bite severity." }),
  baseVenomous({ id: "dugite", commonName: "Dugite", scientificName: "Pseudonaja affinis", family: "Elapidae", genus: "Pseudonaja", continent: "Oceania", subregions: ["Western Australia"], dangerScore: 77, venomClassification: "Highly Venomous", humanEncounterChance: "High", distribution: { regions: ["Western Australia"], habitat: "Coastal scrub and urban fringes" }, description: "Famous urban-interface venomous snake in Western Australia." }),
  baseVenomous({ id: "yellow-bellied-sea-snake", commonName: "Yellow-bellied Sea Snake", scientificName: "Hydrophis platurus", family: "Elapidae", genus: "Hydrophis", continent: "Oceania", subregions: ["Pacific Ocean", "Indian Ocean"], dangerScore: 66, venomClassification: "Highly Venomous", humanEncounterChance: "Low", distribution: { regions: ["Pacific Ocean", "Indian Ocean"], habitat: "Open ocean surface waters" }, description: "Most famous pelagic sea snake, globally distributed in warm oceans." }),
  baseVenomous({ id: "beaked-sea-snake", commonName: "Beaked Sea Snake", scientificName: "Hydrophis schistosus", family: "Elapidae", genus: "Hydrophis", continent: "Oceania", subregions: ["Indian Ocean", "Southeast Asia"], dangerScore: 72, venomClassification: "Highly Venomous", humanEncounterChance: "Moderate", distribution: { regions: ["Indian Ocean", "Southeast Asia"], habitat: "Coastal marine waters" }, description: "Iconic highly venomous sea snake known from fisheries bycatch incidents." }),

  // Famous non-venomous supplements by region
  baseNonVenomous({ id: "emerald-tree-python", commonName: "Emerald Tree Python", scientificName: "Morelia viridis", family: "Pythonidae", genus: "Morelia", continent: "Oceania", subregions: ["New Guinea", "Northern Australia"], humanEncounterChance: "Low", distribution: { regions: ["New Guinea", "Northern Australia"], habitat: "Rainforest canopy" }, description: "Highly recognizable arboreal python and classic zoological species.", maxLength: { value: 2, unit: "m" }, diet: ["mammals", "birds"], constrictor: true }),
  baseNonVenomous({ id: "boa-imperator", commonName: "Boa Imperator", scientificName: "Boa imperator", family: "Boidae", genus: "Boa", continent: "North America", subregions: ["Central America", "Mexico"], humanEncounterChance: "Moderate", distribution: { regions: ["Central America", "Mexico"], habitat: "Forests and dry tropical habitats" }, description: "One of the most famous boas in herpetoculture and educational media.", maxLength: { value: 2.8, unit: "m" }, diet: ["mammals", "birds"], constrictor: true }),
];

function main() {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as { snakes: SnakeRecord[] };

  const normalizedExisting = raw.snakes.map((snake) => {
    const regions = snake.distribution?.regions ?? [];
    const continent = (snake as SnakeRecord & { continent?: Continent }).continent ?? inferContinent(regions);
    const subregions = (snake as SnakeRecord & { subregions?: string[] }).subregions ?? regions;
    const symptoms = (snake as SnakeRecord & { symptomsProgression?: Record<string, unknown> }).symptomsProgression;
    const normalizedSymptoms =
      symptoms &&
      !("shortTerm" in symptoms) &&
      "short" in symptoms &&
      "prog" in symptoms &&
      "crit" in symptoms
        ? {
            shortTerm: symptoms.short as string[],
            progressive: symptoms.prog as string[],
            critical: symptoms.crit as string[],
          }
        : symptoms;

    return {
      ...snake,
      continent,
      subregions,
      ...(normalizedSymptoms && { symptomsProgression: normalizedSymptoms }),
    };
  });

  const byId = new Map<string, SnakeRecord>();
  normalizedExisting.forEach((snake) => byId.set(snake.id, snake));
  curatedAdditions.forEach((snake) => {
    if (!byId.has(snake.id)) byId.set(snake.id, snake);
  });

  const snakes = Array.from(byId.values()).sort((a, b) => {
    const c = String(a.continent).localeCompare(String(b.continent));
    if (c !== 0) return c;
    return a.commonName.localeCompare(b.commonName);
  });

  const out = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    totalSnakes: snakes.length,
    snakes,
  };

  writeFileSync(DATA_PATH, JSON.stringify(out, null, 2));
  console.log(`Curated ${snakes.length} snakes with continent + subregions.`);
}

main();
