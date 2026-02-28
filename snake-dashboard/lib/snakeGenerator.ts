import { getSnakeById } from "./snakeData";

export async function generateDescription(id: string): Promise<string> {
  const snake = getSnakeById(id);
  if (!snake) throw new Error("Snake not found");
  
  // Minimal placeholder implementation - in a real scenario this might call an LLM or a specialized scraper
  // For now we'll fetch from Wikipedia summary if available
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(snake.scientificName.replace(/ /g, "_"))}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.extract || `A species of ${snake.family} found in ${snake.continents.join(", ")}.`;
    }
  } catch (e) {
    console.error("Wikipedia fetch failed:", e);
  }
  
  return `The ${snake.commonName} (${snake.scientificName}) is a medically significant member of the ${snake.family} family.`;
}

export async function generateAKA(id: string): Promise<string[]> {
  // Placeholder logic
  return [];
}
