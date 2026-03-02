import type { Continent, Snake, SnakeDatabase, SnakeSummary } from "./types";
import snakesData from "@/data/snakes/index.json";

/**
 * Load all snakes from the database
 */
export function getAllSnakes(): Snake[] {
  const data = snakesData as SnakeDatabase;
  return data.snakes;
}

/**
 * Get minimal snake summaries for search/home UI.
 * Excludes heavy fields (distribution geometry, symptoms, clinical data, etc.)
 * to reduce client-side JS payload.
 */
export function getSnakeSummaries(): SnakeSummary[] {
  return getAllSnakes().map((s) => ({
    id: s.id,
    commonName: s.commonName,
    scientificName: s.scientificName,
    otherCommonNames: s.otherCommonNames,
    family: s.family,
    genus: s.genus,
    continents: s.continents,
    dangerScore: s.dangerScore,
    venomClassification: s.venomClassification,
    venomTypes: s.venomTypes,
    venomPotency: s.venomPotency
      ? { ld50: s.venomPotency.ld50, ld50Normalized: s.venomPotency.ld50Normalized }
      : undefined,
    disposition: s.disposition,
    popularity: s.popularity,
  }));
}

/**
 * Get a single snake by ID
 */
export function getSnakeById(id: string): Snake | undefined {
  const snakes = getAllSnakes();
  return snakes.find((snake) => snake.id === id);
}

/**
 * Get snakes sorted by danger score (leaderboard)
 */
export function getSnakeLeaderboard(): Snake[] {
  const snakes = getAllSnakes();
  return snakes.sort((a, b) => b.dangerScore - a.dangerScore);
}

/**
 * Filter snakes by venom types
 */
export function filterByVenomTypes(
  snakes: Snake[],
  venomTypes: string[]
): Snake[] {
  if (venomTypes.length === 0) return snakes;

  return snakes.filter((snake) =>
    snake.venomTypes?.some((type) => venomTypes.includes(type)) ?? false
  );
}

/**
 * Filter snakes by danger score range
 */
export function filterByDangerScore(
  snakes: Snake[],
  min: number,
  max: number
): Snake[] {
  return snakes.filter(
    (snake) => snake.dangerScore >= min && snake.dangerScore <= max
  );
}

/**
 * Get unique venom types from all snakes
 */
export function getAllVenomTypes(): string[] {
  const snakes = getAllSnakes();
  const types = new Set<string>();

  snakes.forEach((snake) => {
    snake.venomTypes?.forEach((type) => types.add(type));
  });

  return Array.from(types).sort();
}

/**
 * Filter snakes by venom classification
 */
export function filterByVenomClassification(
  snakes: Snake[],
  classification: "all" | "venomous" | "non-venomous"
): Snake[] {
  if (classification === "all") return snakes;

  const isVenomous = (c: Snake["venomClassification"]) =>
    c !== "Non-venomous";

  if (classification === "venomous") {
    return snakes.filter((s) => isVenomous(s.venomClassification));
  }
  return snakes.filter((s) => s.venomClassification === "Non-venomous");
}

/**
 * Filter snakes by continent
 */
export function filterByContinent(
  snakes: Snake[],
  continent: "all" | Continent
): Snake[] {
  if (continent === "all") return snakes;
  return snakes.filter((snake) => snake.continents.includes(continent));
}

/**
 * Check if a snake is venomous
 */
export function isVenomous(venomClassification: Snake["venomClassification"]): boolean {
  return venomClassification !== "Non-venomous";
}

/**
 * Get median potency score across all venomous snakes (0–100).
 * Used for reference line on potency scale.
 */
export function getMedianPotencyScore(): number {
  const snakes = getAllSnakes();
  const scores = snakes
    .filter((s) => isVenomous(s.venomClassification))
    .map((s) => s.dangerScoreComponents?.potencyScore)
    .filter((v): v is number => typeof v === "number");

  if (scores.length === 0) return 50;

  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/**
 * Get median normalized LD50 across all venomous snakes.
 */
export function getMedianLD50(): number {
  const snakes = getAllSnakes();
  const values = snakes
    .filter((s) => isVenomous(s.venomClassification))
    .map((s) => s.venomPotency?.ld50Normalized || s.venomPotency?.ld50)
    .filter((v): v is number => typeof v === "number" && v > 0);

  if (values.length === 0) return 2.0; // Default fallback

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Get unique families from all snakes
 */
export function getAllFamilies(): string[] {
  const snakes = getAllSnakes();
  const families = new Set<string>();
  
  snakes.forEach((snake) => {
    families.add(snake.family);
  });
  
  return Array.from(families).sort();
}

/**
 * Get unique continents from all snakes
 */
export function getAllContinents(): Continent[] {
  const snakes = getAllSnakes();
  const continents = new Set<Continent>();

  snakes.forEach((snake) => {
    snake.continents.forEach((c) => continents.add(c));
  });

  return Array.from(continents).sort();
}

/**
 * Filter snakes by family
 */
export function filterByFamily(snakes: Snake[], family: string): Snake[] {
  return snakes.filter((snake) => snake.family === family);
}

/**
 * Get snakes grouped by genus within a family
 */
export function getSnakesByFamilyGroupedByGenus(family: string): Map<string, Snake[]> {
  const snakes = getAllSnakes();
  const familySnakes = filterByFamily(snakes, family);
  const grouped = new Map<string, Snake[]>();

  familySnakes.forEach((snake) => {
    const genus = snake.genus;
    if (!grouped.has(genus)) {
      grouped.set(genus, []);
    }
    grouped.get(genus)!.push(snake);
  });

  // Sort snakes within each genus by scientific name
  grouped.forEach((snakes) => {
    snakes.sort((a, b) => a.scientificName.localeCompare(b.scientificName));
  });

  return grouped;
}
