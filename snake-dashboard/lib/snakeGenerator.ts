import { getSnakeById } from "./snakeData";

export async function generateDescription(id: string): Promise<string> {
  const snake = getSnakeById(id);
  if (!snake) throw new Error("Snake not found");
  
  // Minimal placeholder implementation - in a real scenario this might call an LLM or a specialized scraper
  // For now we'll fetch from Wikipedia summary if available
  try {
    const searchTitle = snake.scientificName.charAt(0).toUpperCase() + snake.scientificName.slice(1).toLowerCase();
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle.replace(/ /g, "_"))}`;
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
  const snake = getSnakeById(id);
  if (!snake) throw new Error("Snake not found");

  try {
    // Fetch Wikipedia page content to find common names
    const searchTitle = snake.scientificName.charAt(0).toUpperCase() + snake.scientificName.slice(1).toLowerCase();
    const url = `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(searchTitle.replace(/ /g, "_"))}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const firstSection = data.lead.sections[0].text;
      // Simple regex to find "also known as", "commonly called", etc.
      const akas: string[] = [];
      const match = firstSection.match(/also (?:known|called) as (?:the )?([^.,;:(]+)/i);
      if (match && match[1]) {
        akas.push(...match[1].split(/, | or /).map((s: string) => s.trim().replace(/<\/?[^>]+(>|$)/g, "")));
      }
      return Array.from(new Set(akas)).filter(a => a.toLowerCase() !== snake.commonName.toLowerCase());
    }
  } catch (e) {
    console.error("Wikipedia AKA fetch failed:", e);
  }
  return [];
}

export async function generateMisidentificationRisk(id: string): Promise<{ risk: "high" | "low", lookalikes: string[] }> {
  const snake = getSnakeById(id);
  if (!snake) throw new Error("Snake not found");

  // Common patterns for misidentification
  const lookalikes: string[] = [];
  let risk: "high" | "low" = "low";

  if (snake.family === "Elapidae" && snake.commonName.toLowerCase().includes("coral")) {
    lookalikes.push("milk-snake", "king-snake");
    risk = "high";
  } else if (snake.family === "Viperidae") {
    lookalikes.push("water-snake", "hognose-snake");
    risk = "high";
  }

  return { risk, lookalikes };
}
