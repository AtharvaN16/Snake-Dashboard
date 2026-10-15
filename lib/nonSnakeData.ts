import nonSnakesData from "@/data/non-snakes.json";
import type { VenomType } from "./types";

export interface NonSnake {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  category: "Marine" | "Spider" | "Scorpion" | "Insect" | "Centipede" | "Caterpillar";
  emoji: string;
  venomPotency: {
    ld50Normalized: number;
  };
  venomTypes?: VenomType[];
  description: string;
  continent: string;
  images?: {
    thumbnail: string;
  };
}

export function getNonSnakes(): NonSnake[] {
  return nonSnakesData as NonSnake[];
}
