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

export async function enrichSnakeData(id: string): Promise<Partial<Snake>> {
  const snake = getSnakeById(id);
  if (!snake) throw new Error("Snake not found");

  const searchTitle = snake.scientificName.charAt(0).toUpperCase() + snake.scientificName.slice(1).toLowerCase();
  // Fetch full sections for deep parsing
  const url = `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(searchTitle.replace(/ /g, "_"))}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wikipedia fetch failed");
    
    const data = await res.json();
    // Combine lead and all sections for a global search
    const allSections = [data.lead, ...data.remaining.sections];
    const fullText = allSections.map((s: any) => s.text).join(" ").toLowerCase();
    
    // Specifically target the "Venom" or "Description" sections for numbers
    const venomSection = allSections.find((s: any) => 
      s.line?.toLowerCase().includes("venom") || s.line?.toLowerCase().includes("clinical")
    )?.text.toLowerCase() || "";

    console.log(`[Research Agent] Deep parsing sections for ${snake.scientificName}...`);

    // 1. Extract Family & Genus
    let family = snake.family;
    if (fullText.includes("viperidae")) family = "Viperidae";
    else if (fullText.includes("elapidae")) family = "Elapidae";
    else if (fullText.includes("colubridae")) family = "Colubridae";

    // 2. Extract LD50 (Potency)
    let venomPotency: Partial<VenomPotency> | undefined;
    const ld50Match = venomSection.match(/ld50.*?(?:of|is|at)?\s*(\d+(?:\.\d+)?)\s*mg\/kg/i) || 
                      fullText.match(/ld50.*?(?:of|is|at)?\s*(\d+(?:\.\d+)?)\s*mg\/kg/i);
    if (ld50Match) {
      const val = parseFloat(ld50Match[1]);
      venomPotency = {
        ld50: val,
        ld50Range: `${val}`,
        unit: "mg/kg",
        method: venomSection.includes("intravenous") || venomSection.includes(" iv") ? "IV" : "SC",
        normalized: false
      };
    }

    // 3. Extract Fatality Rates
    let clinicalData: Partial<ClinicalData> | undefined;
    const fatalityMatch = fullText.match(/(?:fatality|mortality).*?(\d+(?:-\d+)?)\s*%/i);
    if (fatalityMatch) {
      const parts = fatalityMatch[1].split("-").map(p => parseInt(p));
      clinicalData = {
        untreatedFatalityRate: { low: parts[0], high: parts[1] || parts[0] },
        severity: parts[0] > 20 ? "Life-threatening" : parts[0] > 5 ? "Severe" : "Moderate"
      };
    }

    // 4. Extract WHO Category
    let whoCategory: 1 | 2 | undefined;
    if (fullText.includes("highest medical importance") || fullText.includes("category 1")) whoCategory = 1;
    else if (fullText.includes("secondary medical importance") || fullText.includes("category 2")) whoCategory = 2;

    if (clinicalData && whoCategory) clinicalData.whoCategory = whoCategory;

    // 5. Extract Venom Types
    const venomTypes: VenomType[] = [];
    if (fullText.includes("neurotox")) venomTypes.push("Neurotoxic");
    if (fullText.includes("hemotox")) venomTypes.push("Hemotoxic");
    if (fullText.includes("cytotox")) venomTypes.push("Cytotoxic");
    if (fullText.includes("myotox")) venomTypes.push("Myotoxic");

    // 6. Extract Continents
    const continents: Continent[] = [];
    if (fullText.includes("africa")) continents.push("Africa");
    if (fullText.includes("asia")) continents.push("Asia");
    if (fullText.includes("europe")) continents.push("Europe");
    if (fullText.includes("north america")) continents.push("North America");
    if (fullText.includes("south america")) continents.push("South America");
    if (fullText.includes("australia") || fullText.includes("oceania")) continents.push("Oceania");

    return {
      family,
      venomPotency: venomPotency as VenomPotency,
      clinicalData: clinicalData as ClinicalData,
      venomTypes: venomTypes.length > 0 ? venomTypes : undefined,
      continents: continents.length > 0 ? continents : undefined,
      venomClassification: family === "Viperidae" || family === "Elapidae" ? "Highly Venomous" : "Venomous"
    };
  } catch (e) {
    console.error("Deep enrichment failed:", e);
    return {};
  }
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
