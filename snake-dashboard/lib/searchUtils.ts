import Fuse from "fuse.js";
import type { Snake, SnakeSummary } from "./types";

const fuseOptions = {
  keys: [
    { name: "commonName", weight: 2 },
    { name: "otherCommonNames", weight: 2 },
    { name: "scientificName", weight: 1.5 },
    { name: "family", weight: 0.5 },
    { name: "genus", weight: 0.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
};

/**
 * Search snakes using fuzzy matching. Accepts full Snake or SnakeSummary arrays.
 */
export function searchSnakes<T extends SnakeSummary>(snakes: T[], query: string): T[] {
  if (!query || query.trim() === "") return snakes;

  const fuse = new Fuse(snakes, fuseOptions);
  const results = fuse.search(query);

  return results.map((result) => result.item);
}

/**
 * Sort snakes by various criteria
 */
export type SortOption =
  | "default"
  | "venomType"
  | "region"
  | "family"
  | "rank"
  | "alphabetical"
  | "potency";

export function sortSnakes<T extends SnakeSummary>(snakes: T[], sortBy: SortOption): T[] {
  const sorted = [...snakes];
  const classificationOrder: Record<Snake["venomClassification"], number> = {
    "Highly Venomous": 0,
    Venomous: 1,
    "Moderately Venomous": 2,
    "Mildly Venomous": 3,
    "Non-venomous": 4,
  };

  const getPrimaryVenomType = (snake: SnakeSummary) => snake.venomTypes?.[0] ?? "No venom type";
  const getPrimaryRegion = (snake: SnakeSummary) => snake.continent;
  
  switch (sortBy) {
    case "default":
      return sorted.sort((a, b) => {
        const classificationCompare =
          classificationOrder[a.venomClassification] -
          classificationOrder[b.venomClassification];
        if (classificationCompare !== 0) return classificationCompare;
        return a.commonName.localeCompare(b.commonName);
      });

    case "venomType":
      return sorted.sort((a, b) => {
        const venomTypeCompare = getPrimaryVenomType(a).localeCompare(
          getPrimaryVenomType(b)
        );
        if (venomTypeCompare !== 0) return venomTypeCompare;
        return a.commonName.localeCompare(b.commonName);
      });

    case "region":
      return sorted.sort((a, b) => {
        const regionCompare = getPrimaryRegion(a).localeCompare(getPrimaryRegion(b));
        if (regionCompare !== 0) return regionCompare;
        return a.commonName.localeCompare(b.commonName);
      });

    case "rank":
      return sorted.sort((a, b) => b.dangerScore - a.dangerScore);
    
    case "alphabetical":
      return sorted.sort((a, b) =>
        a.commonName.localeCompare(b.commonName)
      );
    
    case "family":
      return sorted.sort((a, b) => {
        const familyCompare = a.family.localeCompare(b.family);
        if (familyCompare !== 0) return familyCompare;
        return a.commonName.localeCompare(b.commonName);
      });
    
    case "potency":
      return sorted.sort((a, b) => {
        const aLd50 = a.venomPotency?.ld50 ?? Infinity;
        const bLd50 = b.venomPotency?.ld50 ?? Infinity;
        return aLd50 - bLd50;
      });
    
    default:
      return sorted;
  }
}
