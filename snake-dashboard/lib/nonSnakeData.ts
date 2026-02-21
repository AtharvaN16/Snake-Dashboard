import nonSnakesData from "@/data/non-snakes.json";

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
  description: string;
  continent: string;
  images?: {
    thumbnail: string;
  };
}

export function getNonSnakes(): NonSnake[] {
  return nonSnakesData as NonSnake[];
}
