/**
 * Build complete 100-snake dataset.
 * Run from project root: bun run scripts/build100Snakes.ts
 * Output: data/snakes/index.json
 */

import { writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { computeDangerScoreForSnake, rankSnakes } from "../lib/dangerScore";
import type { Snake } from "../lib/types";
import { dataFixes } from "./build/dataFixes";
import { clinicalFixes } from "./build/clinicalFixes";
import { fangTypes } from "./build/fangTypes";

// Helper to load attribution from file system
const loadAttributionFromFile = (id: string) => {
  const attributionPath = join(__dirname, "../public/images/snakes", id, "attribution.json");
  try {
    if (existsSync(attributionPath)) {
      const content = readFileSync(attributionPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    // If file doesn't exist or can't be read, return placeholder
  }
  return { source: "Placeholder", license: "CC BY 4.0", url: "https://placeholder.com" };
};

// Helper to load gallery metadata
const loadGalleryMetadata = (id: string) => {
  const galleryMetaPath = join(__dirname, "../public/images/snakes", id, "gallery-metadata.json");
  try {
    if (existsSync(galleryMetaPath)) {
      const content = readFileSync(galleryMetaPath, "utf-8");
      const parsed = JSON.parse(content) as { images?: string[]; attributions?: unknown[] };
      const images = Array.isArray(parsed.images) ? parsed.images : [];
      const attributions = Array.isArray(parsed.attributions) ? parsed.attributions : [];

      // Drop stale metadata entries that point to missing files.
      const valid: Array<{ image: string; attribution: unknown }> = images
        .map((image, idx) => ({ image, attribution: attributions[idx] }))
        .filter(({ image }) =>
          existsSync(join(__dirname, "../public", String(image).replace(/^\//, "")))
        );

      if (valid.length === 0) return null;
      return {
        images: valid.map((v) => v.image),
        attributions: valid.map((v) => v.attribution),
      };
    }
  } catch (error) {
    // If file doesn't exist, return null
  }
  return null;
};

// Fallback: infer gallery images directly from public/images/snakes/<id>/gallery when metadata is missing.
const loadGalleryFromFiles = (id: string): string[] | null => {
  const galleryDir = join(__dirname, "../public/images/snakes", id, "gallery");
  try {
    if (!existsSync(galleryDir)) return null;
    const files = readdirSync(galleryDir)
      .filter((f) => /^\d+\.(jpg|jpeg|png)$/i.test(f))
      .sort((a, b) => {
        const ai = Number((a.match(/^(\d+)/) ?? [])[1] ?? Number.MAX_SAFE_INTEGER);
        const bi = Number((b.match(/^(\d+)/) ?? [])[1] ?? Number.MAX_SAFE_INTEGER);
        return ai - bi;
      });
    if (files.length === 0) return null;
    return files.map((f) => `/images/snakes/${id}/gallery/${f}`);
  } catch {
    return null;
  }
};

// Template helpers
const img = (id: string) => {
  const baseAttribution = loadAttributionFromFile(id);
  const galleryMeta = loadGalleryMetadata(id);
  const fileGallery = loadGalleryFromFiles(id);
  const gallery = galleryMeta?.images ?? fileGallery ?? undefined;
  const galleryAttributions =
    galleryMeta?.attributions ??
    (fileGallery ? fileGallery.map(() => baseAttribution) : undefined);
  
  return {
    primary: `/images/snakes/${id}/primary.jpg`,
    thumbnail: `/images/snakes/${id}/thumbnail.jpg`,
    gallery,
    attribution: baseAttribution,
    galleryAttributions,
  };
};

const venomous = (
  id: string,
  commonName: string,
  sci: string,
  family: string,
  genus: string,
  dangerScore: number,
  rank: string,
  potency: { ld50: number; range: string; method: "IV" | "SC" },
  vYield: { dry?: number; vol?: number; qual: "Extremely High" | "High" | "Moderate" | "Low" | "Very Low" },
  venomTypes: string[],
  speed: "Extremely quick" | "Quick" | "Slow",
  symptoms: { short: string[]; prog: string[]; crit: string[] },
  encounter: "Low" | "Moderate" | "High" | "Very High",
  regions: string[],
  habitat: string,
  coords: [number, number],
  description: string,
  classification: "Highly Venomous" | "Venomous" | "Moderately Venomous" | "Mildly Venomous" = "Highly Venomous"
) => ({
  id,
  commonName,
  scientificName: sci,
  family,
  genus,
  dangerScore,
  dangerRank: rank,
  dangerScoreComponents: undefined as any,
  venomClassification: classification,
  venomPotency: { ld50: potency.ld50, ld50Range: potency.range, unit: "mg/kg", method: potency.method },
  venomYield: {
    ...(vYield.dry && { dryWeight: vYield.dry }),
    ...(vYield.vol && { wetVolume: vYield.vol }),
    qualitative: vYield.qual,
  },
  venomTypes,
  venomSpeed: speed,
  symptomsProgression: symptoms,
  humanEncounterChance: encounter,
  distribution: { regions, habitat, coordinates: [{ lat: coords[0], lng: coords[1] }] },
  images: img(id),
  description,
  sources: ["WHO", "Reptile Database", "Wikipedia"],
});

const nonvenomous = (
  id: string,
  commonName: string,
  sci: string,
  family: string,
  genus: string,
  encounter: "Low" | "Moderate" | "High",
  regions: string[],
  habitat: string,
  coords: [number, number],
  description: string,
  opts?: { maxLength?: [number, "m" | "cm"]; diet?: string[]; constrictor?: boolean }
) => ({
  id,
  commonName,
  scientificName: sci,
  family,
  genus,
  dangerScore: 0,
  dangerRank: "N/A",
  venomClassification: "Non-venomous" as const,
  humanEncounterChance: encounter,
  distribution: { regions, habitat, coordinates: [{ lat: coords[0], lng: coords[1] }] },
  images: img(id),
  description,
  ...(opts?.maxLength && { maxLength: { value: opts.maxLength[0], unit: opts.maxLength[1] } }),
  ...(opts?.diet && { diet: opts.diet }),
  ...(opts?.constrictor && { constrictor: true }),
  sources: ["Reptile Database", "Wikipedia"],
});

// New snakes to add (91 total)
const newSnakes = [
  // === HIGHLY VENOMOUS (+20) ===
  venomous(
    "coastal-taipan",
    "Coastal Taipan",
    "Oxyuranus scutellatus",
    "Elapidae",
    "Oxyuranus",
    90,
    "6/100",
    { ld50: 0.1, range: "0.09-0.1", method: "SC" },
    { dry: 120, vol: 0.4, qual: "High" },
    ["Neurotoxic", "Hemotoxic", "Myotoxic"],
    "Extremely quick",
    {
      short: ["Headache", "Nausea", "Abdominal pain"],
      prog: ["Paralysis", "Coagulopathy", "Renal damage"],
      crit: ["Respiratory failure", "Death without treatment"],
    },
    "Moderate",
    ["Northern Australia", "New Guinea"],
    "Coastal dunes, woodlands, sugar cane fields",
    [-15, 145],
    "Third most venomous land snake. Aggressive when cornered. Previously caused many deaths before antivenom.",
    "Highly Venomous"
  ),
  venomous(
    "tiger-snake",
    "Tiger Snake",
    "Notechis scutatus",
    "Elapidae",
    "Notechis",
    88,
    "7/100",
    { ld50: 0.06, range: "0.04-0.1", method: "SC" },
    { dry: 35, vol: 0.07, qual: "Moderate" },
    ["Neurotoxic", "Hemotoxic", "Myotoxic"],
    "Quick",
    {
      short: ["Local pain", "Tingling", "Sweating"],
      prog: ["Paralysis", "Coagulopathy"],
      crit: ["Respiratory failure", "Death"],
    },
    "High",
    ["Southeastern Australia", "Tasmania"],
    "Wetlands, creeks, coastal heath",
    [-37.8, 145],
    "Highly variable in color. Responsible for many bites in southern Australia. Antivenom widely available.",
    "Highly Venomous"
  ),
  venomous(
    "death-adder",
    "Common Death Adder",
    "Acanthophis antarcticus",
    "Elapidae",
    "Acanthophis",
    85,
    "8/100",
    { ld50: 0.4, range: "0.3-0.5", method: "SC" },
    { dry: 70, vol: 0.2, qual: "Moderate" },
    ["Neurotoxic"],
    "Extremely quick",
    {
      short: ["Pain", "Numbness", "Paralysis onset"],
      prog: ["Progressive paralysis"],
      crit: ["Respiratory failure"],
    },
    "Moderate",
    ["Australia"],
    "Woodlands, grasslands, coastal dunes",
    [-25, 133],
    "Uses caudal lure to attract prey. Extremely fast strike. Can deliver multiple bites.",
    "Highly Venomous"
  ),
  venomous(
    "russells-viper",
    "Russell's Viper",
    "Daboia russelii",
    "Viperidae",
    "Daboia",
    92,
    "9/100",
    { ld50: 0.13, range: "0.08-0.2", method: "IV" },
    { dry: 130, vol: 0.25, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Bleeding"],
      prog: ["Coagulopathy", "Renal failure", "Shock"],
      crit: ["Internal bleeding", "Death"],
    },
    "Very High",
    ["South Asia", "Southeast Asia"],
    "Open country, farmland, scrub",
    [20, 77],
    "Causes more snakebite deaths in India than any other species. Highly aggressive.",
    "Highly Venomous"
  ),
  venomous(
    "saw-scaled-viper",
    "Saw-scaled Viper",
    "Echis carinatus",
    "Viperidae",
    "Echis",
    90,
    "10/100",
    { ld50: 0.24, range: "0.2-0.5", method: "IV" },
    { dry: 20, vol: 0.01, qual: "Low" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Local pain", "Swelling", "Bleeding"],
      prog: ["Coagulopathy", "Renal damage"],
      crit: ["Hemorrhage", "Death"],
    },
    "Very High",
    ["Middle East", "North Africa", "South Asia"],
    "Arid regions, deserts, rocky areas",
    [25, 55],
    "Small but extremely dangerous. Produces sizzling sound when threatened. Major cause of bites.",
    "Highly Venomous"
  ),
  venomous(
    "philippine-cobra",
    "Philippine Cobra",
    "Naja philippinensis",
    "Elapidae",
    "Naja",
    88,
    "11/100",
    { ld50: 0.14, range: "0.12-0.18", method: "IV" },
    { dry: 90, vol: 0.2, qual: "Moderate" },
    ["Neurotoxic"],
    "Extremely quick",
    {
      short: ["Blurred vision", "Drowsiness", "Difficulty breathing"],
      prog: ["Paralysis"],
      crit: ["Respiratory failure", "Death within 1 hour"],
    },
    "High",
    ["Philippines"],
    "Lowland forests, agricultural areas",
    [14, 121],
    "Can accurately spit venom up to 3 meters. Neurotoxic venom acts rapidly.",
    "Highly Venomous"
  ),
  venomous(
    "many-banded-krait",
    "Many-banded Krait",
    "Bungarus multicinctus",
    "Elapidae",
    "Bungarus",
    90,
    "12/100",
    { ld50: 0.09, range: "0.08-0.1", method: "IV" },
    { dry: 4, vol: 0.01, qual: "Low" },
    ["Neurotoxic"],
    "Quick",
    {
      short: ["Mild pain", "Numbness"],
      prog: ["Progressive paralysis", "Ptosis"],
      crit: ["Respiratory failure", "Death"],
    },
    "Moderate",
    ["East Asia", "Southeast Asia"],
    "Rice paddies, marshes, forests",
    [22, 114],
    "One of the most venomous kraits. Nocturnal. Bites often painless initially.",
    "Highly Venomous"
  ),
  venomous(
    "egyptian-cobra",
    "Egyptian Cobra",
    "Naja haje",
    "Elapidae",
    "Naja",
    82,
    "13/100",
    { ld50: 0.19, range: "0.15-0.25", method: "IV" },
    { dry: 200, vol: 0.5, qual: "High" },
    ["Neurotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Drowsiness"],
      prog: ["Paralysis"],
      crit: ["Respiratory failure"],
    },
    "Moderate",
    ["North Africa", "Arabian Peninsula"],
    "Deserts, semi-deserts, agricultural land",
    [30, 31],
    "Historically significant. Cleopatra reportedly died from its bite. Large hood display.",
    "Highly Venomous"
  ),
  venomous(
    "forest-cobra",
    "Forest Cobra",
    "Naja melanoleuca",
    "Elapidae",
    "Naja",
    84,
    "14/100",
    { ld50: 0.22, range: "0.2-0.3", method: "IV" },
    { dry: 350, vol: 0.9, qual: "High" },
    ["Neurotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Numbness"],
      prog: ["Paralysis", "Necrosis"],
      crit: ["Respiratory failure"],
    },
    "Low",
    ["Central Africa", "West Africa"],
    "Forests, savannas, near water",
    [0, 20],
    "Africa's largest cobra. Aggressive when cornered. Good climber and swimmer.",
    "Highly Venomous"
  ),
  venomous(
    "indian-cobra",
    "Indian Cobra",
    "Naja naja",
    "Elapidae",
    "Naja",
    85,
    "15/100",
    { ld50: 0.29, range: "0.2-0.4", method: "IV" },
    { dry: 170, vol: 0.4, qual: "Moderate" },
    ["Neurotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Drowsiness"],
      prog: ["Paralysis", "Ptosis"],
      crit: ["Respiratory failure"],
    },
    "Very High",
    ["South Asia"],
    "Farmland, villages, forests",
    [20, 77],
    "Sacred in Hinduism. Spectacled marking on hood. Major cause of snakebites in India.",
    "Highly Venomous"
  ),
  venomous(
    "cape-cobra",
    "Cape Cobra",
    "Naja nivea",
    "Elapidae",
    "Naja",
    86,
    "16/100",
    { ld50: 0.37, range: "0.3-0.5", method: "IV" },
    { dry: 100, vol: 0.2, qual: "Moderate" },
    ["Neurotoxic", "Cytotoxic"],
    "Extremely quick",
    {
      short: ["Pain", "Ptosis", "Drowsiness"],
      prog: ["Paralysis"],
      crit: ["Respiratory failure", "Death within 1-10 hours"],
    },
    "Moderate",
    ["Southern Africa"],
    "Arid regions, scrubland, fynbos",
    [-33, 18],
    "Highly venomous cobra. Variable in color. Aggressive when threatened.",
    "Highly Venomous"
  ),
  venomous(
    "puff-adder",
    "Puff Adder",
    "Bitis arietans",
    "Viperidae",
    "Bitis",
    82,
    "17/100",
    { ld50: 0.4, range: "0.3-0.6", method: "IV" },
    { dry: 350, vol: 0.9, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Extremely quick",
    {
      short: ["Severe pain", "Swelling", "Blisters"],
      prog: ["Necrosis", "Coagulopathy"],
      crit: ["Shock", "Death"],
    },
    "Very High",
    ["Africa", "Arabian Peninsula"],
    "Savannas, grasslands, suburbs",
    [-25, 28],
    "Causes more snakebite fatalities in Africa than any other. Relies on camouflage.",
    "Highly Venomous"
  ),
  venomous(
    "eastern-diamondback",
    "Eastern Diamondback Rattlesnake",
    "Crotalus adamanteus",
    "Viperidae",
    "Crotalus",
    80,
    "18/100",
    { ld50: 1.6, range: "1.2-2.0", method: "IV" },
    { dry: 400, vol: 1.0, qual: "Extremely High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Bruising"],
      prog: ["Tissue damage", "Coagulopathy"],
      crit: ["Shock", "Organ failure"],
    },
    "Moderate",
    ["Southeastern United States"],
    "Pine forests, palmetto flats, coastal scrub",
    [30, -85],
    "Largest rattlesnake. Highest venom yield of any North American snake.",
    "Highly Venomous"
  ),
  venomous(
    "western-diamondback",
    "Western Diamondback Rattlesnake",
    "Crotalus atrox",
    "Viperidae",
    "Crotalus",
    78,
    "19/100",
    { ld50: 2.2, range: "1.8-2.8", method: "IV" },
    { dry: 250, vol: 0.6, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Bleeding"],
      prog: ["Tissue damage", "Coagulopathy"],
      crit: ["Shock", "Death"],
    },
    "High",
    ["Southwestern United States", "Mexico"],
    "Deserts, grasslands, scrub",
    [32, -106],
    "Responsible for more bites in the US than any other rattlesnake.",
    "Highly Venomous"
  ),
  venomous(
    "mojave-rattlesnake",
    "Mojave Rattlesnake",
    "Crotalus scutulatus",
    "Viperidae",
    "Crotalus",
    84,
    "20/100",
    { ld50: 0.23, range: "0.18-0.3", method: "IV" },
    { dry: 50, vol: 0.15, qual: "Moderate" },
    ["Neurotoxic", "Hemotoxic"],
    "Quick",
    {
      short: ["Pain", "Weakness", "Difficulty breathing"],
      prog: ["Paralysis", "Respiratory depression"],
      crit: ["Respiratory failure", "Death"],
    },
    "Low",
    ["Southwestern United States", "Mexico"],
    "Deserts, scrubland",
    [35, -115],
    "Possesses potent neurotoxic component. Considered most dangerous US rattlesnake.",
    "Highly Venomous"
  ),
  venomous(
    "fer-de-lance",
    "Fer-de-Lance",
    "Bothrops asper",
    "Viperidae",
    "Bothrops",
    86,
    "21/100",
    { ld50: 2.8, range: "2.0-4.0", method: "IV" },
    { dry: 250, vol: 0.5, qual: "High" },
    ["Hemotoxic", "Cytotoxic", "Myotoxic"],
    "Extremely quick",
    {
      short: ["Severe pain", "Swelling", "Bleeding"],
      prog: ["Necrosis", "Coagulopathy"],
      crit: ["Shock", "Death"],
    },
    "Very High",
    ["Central America", "Northern South America"],
    "Tropical rainforests, plantations",
    [10, -84],
    "Responsible for most snakebite fatalities in Central America. Aggressive and fast.",
    "Highly Venomous"
  ),
  venomous(
    "bushmaster",
    "Bushmaster",
    "Lachesis muta",
    "Viperidae",
    "Lachesis",
    75,
    "22/100",
    { ld50: 1.6, range: "1.2-2.0", method: "IV" },
    { dry: 200, vol: 0.5, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Vomiting"],
      prog: ["Hypotension", "Bradycardia"],
      crit: ["Shock", "Death"],
    },
    "Low",
    ["South America"],
    "Tropical rainforests",
    [-5, -60],
    "Longest viper in the world. Produces loud rattling with tail. Rarely encountered.",
    "Highly Venomous"
  ),
  venomous(
    "malayan-pit-viper",
    "Malayan Pit Viper",
    "Calloselasma rhodostoma",
    "Viperidae",
    "Calloselasma",
    78,
    "23/100",
    { ld50: 1.6, range: "1.2-2.0", method: "IV" },
    { dry: 25, vol: 0.05, qual: "Low" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Blisters"],
      prog: ["Necrosis", "Coagulopathy"],
      crit: ["Gangrene", "Death"],
    },
    "High",
    ["Southeast Asia"],
    "Forests, plantations, villages",
    [14, 101],
    "Common cause of bites in Southeast Asia. Often found in rubber plantations.",
    "Highly Venomous"
  ),
  venomous(
    "japanese-mamushi",
    "Japanese Mamushi",
    "Gloydius blomhoffii",
    "Viperidae",
    "Gloydius",
    72,
    "24/100",
    { ld50: 0.3, range: "0.2-0.4", method: "IV" },
    { dry: 15, vol: 0.03, qual: "Low" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Nausea"],
      prog: ["Coagulopathy", "Renal damage"],
      crit: ["Shock", "Death"],
    },
    "Moderate",
    ["Japan", "East Asia"],
    "Mountains, forests, farmland",
    [35, 139],
    "Most venomous snake in Japan. Bites thousands annually. Antivenom available.",
    "Highly Venomous"
  ),
  venomous(
    "black-necked-spitting-cobra",
    "Black-necked Spitting Cobra",
    "Naja nigricollis",
    "Elapidae",
    "Naja",
    76,
    "25/100",
    { ld50: 1.15, range: "1.0-1.3", method: "IV" },
    { dry: 200, vol: 0.5, qual: "High" },
    ["Cytotoxic", "Neurotoxic"],
    "Extremely quick",
    {
      short: ["Severe eye pain", "Blindness if sprayed", "Local necrosis"],
      prog: ["Tissue damage"],
      crit: ["Permanent eye damage if not flushed"],
    },
    "Moderate",
    ["Sub-Saharan Africa"],
    "Savannas, grasslands, near water",
    [-5, 25],
    "Can spit venom accurately up to 3 meters. Primarily cytotoxic; blinding if hits eyes.",
    "Highly Venomous"
  ),

  // === MODERATELY / MILDLY VENOMOUS (+25) ===
  venomous(
    "copperhead",
    "Copperhead",
    "Agkistrodon contortrix",
    "Viperidae",
    "Agkistrodon",
    55,
    "26/100",
    { ld50: 10.9, range: "8-15", method: "IV" },
    { dry: 85, vol: 0.04, qual: "Moderate" },
    ["Hemotoxic", "Cytotoxic"],
    "Slow",
    {
      short: ["Pain", "Swelling", "Nausea"],
      prog: ["Tissue damage", "Rare systemic effects"],
      crit: ["Rare death", "Antivenom rarely needed"],
    },
    "High",
    ["Eastern United States"],
    "Forests, rocky areas, suburbs",
    [36, -80],
    "Most common venomous snake bite in eastern US. Usually not life-threatening.",
    "Moderately Venomous"
  ),
  venomous(
    "cottonmouth",
    "Cottonmouth",
    "Agkistrodon piscivorus",
    "Viperidae",
    "Agkistrodon",
    60,
    "27/100",
    { ld50: 4.0, range: "2.5-5.5", method: "IV" },
    { dry: 125, vol: 0.1, qual: "Moderate" },
    ["Hemotoxic", "Cytotoxic"],
    "Slow",
    {
      short: ["Severe pain", "Swelling", "Tissue damage"],
      prog: ["Necrosis", "Coagulopathy rarely"],
      crit: ["Rare death"],
    },
    "Moderate",
    ["Southeastern United States"],
    "Swamps, marshes, streams",
    [30, -90],
    "Semi-aquatic. Displays white mouth when threatened. More venomous than copperhead.",
    "Moderately Venomous"
  ),
  venomous(
    "coral-snake",
    "Eastern Coral Snake",
    "Micrurus fulvius",
    "Elapidae",
    "Micrurus",
    70,
    "28/100",
    { ld50: 0.2, range: "0.15-0.3", method: "IV" },
    { dry: 3, vol: 0.001, qual: "Very Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Minimal pain", "Numbness"],
      prog: ["Paralysis", "Respiratory depression"],
      crit: ["Respiratory failure", "Death rare due to small yield"],
    },
    "Low",
    ["Southeastern United States"],
    "Forests, scrubland, suburban areas",
    [28, -82],
    "Potent neurotoxin but tiny fangs and low yield. 'Red touch black' rhyme for identification.",
    "Moderately Venomous"
  ),
  venomous(
    "western-hognose",
    "Western Hognose Snake",
    "Heterodon nasicus",
    "Colubridae",
    "Heterodon",
    25,
    "29/100",
    { ld50: 200, range: "150-300", method: "IV" },
    { dry: 5, qual: "Very Low" },
    ["Cytotoxic"],
    "Slow",
    {
      short: ["Mild swelling", "Itching", "Rare allergic reaction"],
      prog: ["Rare"],
      crit: ["Essentially harmless to humans"],
    },
    "Moderate",
    ["Central United States", "Mexico"],
    "Prairies, grasslands, sandy areas",
    [40, -100],
    "Rear-fanged. Mild venom. Famous for playing dead when threatened.",
    "Mildly Venomous"
  ),
  venomous(
    "boomslang",
    "Boomslang",
    "Dispholidus typus",
    "Colubridae",
    "Dispholidus",
    75,
    "30/100",
    { ld50: 0.07, range: "0.05-0.1", method: "IV" },
    { dry: 8, vol: 0.02, qual: "Very Low" },
    ["Hemotoxic"],
    "Slow",
    {
      short: ["Headache", "Nausea", "Drowsiness"],
      prog: ["Internal bleeding", "Coagulopathy"],
      crit: ["Death from hemorrhage", "Delayed 24-48 hours"],
    },
    "Low",
    ["Sub-Saharan Africa"],
    "Trees, shrubs, savannas",
    [-25, 28],
    "Rear-fanged. Highly potent hemotoxic venom but very low yield. Bites rare.",
    "Highly Venomous"
  ),
  venomous(
    "mangrove-snake",
    "Mangrove Snake",
    "Boiga dendrophila",
    "Colubridae",
    "Boiga",
    45,
    "31/100",
    { ld50: 8.0, range: "5-12", method: "IV" },
    { dry: 15, qual: "Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Local pain", "Swelling", "Mild necrosis"],
      prog: ["Rare systemic"],
      crit: ["Essentially not life-threatening"],
    },
    "Low",
    ["Southeast Asia"],
    "Mangroves, forests, near water",
    [5, 110],
    "Rear-fanged. Mild venom. Nocturnal. Beautiful black and yellow banding.",
    "Mildly Venomous"
  ),
  venomous(
    "green-vine-snake",
    "Green Vine Snake",
    "Ahaetulla nasuta",
    "Colubridae",
    "Ahaetulla",
    20,
    "32/100",
    { ld50: 300, range: "200-400", method: "IV" },
    { dry: 2, qual: "Very Low" },
    ["Hemotoxic"],
    "Slow",
    {
      short: ["Mild local reaction"],
      prog: ["None"],
      crit: ["Harmless"],
    },
    "Moderate",
    ["South Asia", "Southeast Asia"],
    "Forests, gardens, shrubs",
    [15, 78],
    "Rear-fanged. Mild venom. Elongated body for arboreal life.",
    "Mildly Venomous"
  ),
  venomous(
    "brown-tree-snake",
    "Brown Tree Snake",
    "Boiga irregularis",
    "Colubridae",
    "Boiga",
    40,
    "33/100",
    { ld50: 10.0, range: "5-15", method: "IV" },
    { dry: 10, qual: "Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Mild local effects"],
      prog: ["Rare"],
      crit: ["Not dangerous to adults"],
    },
    "High",
    ["Australia", "Papua New Guinea", "Guam"],
    "Forests, urban areas",
    [-12, 130],
    "Invasive in Guam. Mild venom. Responsible for power outages by climbing poles.",
    "Mildly Venomous"
  ),
  venomous(
    "red-bellied-black-snake",
    "Red-bellied Black Snake",
    "Pseudechis porphyriacus",
    "Elapidae",
    "Pseudechis",
    65,
    "34/100",
    { ld50: 2.5, range: "2.0-3.0", method: "SC" },
    { dry: 37, vol: 0.1, qual: "Moderate" },
    ["Neurotoxic", "Hemotoxic", "Myotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Nausea"],
      prog: ["Coagulopathy", "Myolysis"],
      crit: ["Rare death"],
    },
    "High",
    ["Eastern Australia"],
    "Swamps, creeks, forests",
    [-33, 151],
    "Often found near water. Generally shy. Bites painful but rarely fatal with treatment.",
    "Moderately Venomous"
  ),
  venomous(
    "lowlands-copperhead",
    "Lowlands Copperhead",
    "Austrelaps superbus",
    "Elapidae",
    "Austrelaps",
    60,
    "35/100",
    { ld50: 0.5, range: "0.4-0.6", method: "SC" },
    { dry: 30, qual: "Moderate" },
    ["Neurotoxic", "Hemotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Nausea"],
      prog: ["Coagulopathy"],
      crit: ["Rare death"],
    },
    "Moderate",
    ["Southeastern Australia", "Tasmania"],
    "Wetlands, grasslands",
    [-42, 147],
    "Only venomous snake in Tasmania. Generally docile.",
    "Moderately Venomous"
  ),
  venomous(
    "rock-rattlesnake",
    "Rock Rattlesnake",
    "Crotalus lepidus",
    "Viperidae",
    "Crotalus",
    55,
    "36/100",
    { ld50: 2.6, range: "2.0-3.5", method: "IV" },
    { dry: 30, qual: "Low" },
    ["Hemotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling"],
      prog: ["Tissue damage"],
      crit: ["Rare death"],
    },
    "Low",
    ["Southwestern United States", "Mexico"],
    "Rocky outcrops, canyonlands",
    [31, -106],
    "Small rattlesnake. Venom potency variable. Rarely encountered.",
    "Moderately Venomous"
  ),
  venomous(
    "cantil",
    "Cantil",
    "Agkistrodon bilineatus",
    "Viperidae",
    "Agkistrodon",
    62,
    "37/100",
    { ld50: 3.0, range: "2.5-4.0", method: "IV" },
    { dry: 150, qual: "Moderate" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Bleeding"],
      prog: ["Necrosis"],
      crit: ["Rare death"],
    },
    "Low",
    ["Mexico", "Central America"],
    "Tropical forests, near water",
    [18, -95],
    "Related to cottonmouth. Aggressive. Yellow-tipped tail used as lure.",
    "Moderately Venomous"
  ),
  venomous(
    "eyelash-viper",
    "Eyelash Viper",
    "Bothriechis schlegelii",
    "Viperidae",
    "Bothriechis",
    58,
    "38/100",
    { ld50: 2.8, range: "2.0-4.0", method: "IV" },
    { dry: 15, qual: "Low" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Blisters"],
      prog: ["Local necrosis"],
      crit: ["Rare systemic"],
    },
    "Moderate",
    ["Central America", "South America"],
    "Rainforest canopy, shrubs",
    [10, -84],
    "Arboreal. Variable colors. Small but painful bite.",
    "Moderately Venomous"
  ),
  venomous(
    "white-lipped-viper",
    "White-lipped Pit Viper",
    "Trimeresurus albolabris",
    "Viperidae",
    "Trimeresurus",
    55,
    "39/100",
    { ld50: 2.1, range: "1.5-3.0", method: "IV" },
    { dry: 30, qual: "Low" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Bleeding"],
      prog: ["Local necrosis"],
      crit: ["Rare"],
    },
    "High",
    ["Southeast Asia"],
    "Forests, gardens, plantations",
    [15, 102],
    "Common in Southeast Asia. Arboreal. Green with white lip.",
    "Moderately Venomous"
  ),
  venomous(
    "waglers-pit-viper",
    "Wagler's Pit Viper",
    "Tropidolaemus wagleri",
    "Viperidae",
    "Tropidolaemus",
    52,
    "40/100",
    { ld50: 6.0, range: "4-8", method: "IV" },
    { dry: 25, qual: "Low" },
    ["Hemotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling"],
      prog: ["Local tissue damage"],
      crit: ["Rare"],
    },
    "Moderate",
    ["Southeast Asia"],
    "Forests, Temple of the Azure Cloud (famous population)",
    [5, 100],
    "Arboreal. Docile. Temple pit viper in Penang.",
    "Moderately Venomous"
  ),
  venomous(
    "night-adder",
    "Night Adder",
    "Causus rhombeatus",
    "Viperidae",
    "Causus",
    45,
    "41/100",
    { ld50: 1.1, range: "0.8-1.5", method: "IV" },
    { dry: 20, qual: "Low" },
    ["Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Blisters"],
      prog: ["Local necrosis"],
      crit: ["Rare systemic"],
    },
    "Moderate",
    ["Sub-Saharan Africa"],
    "Savannas, grasslands",
    [-25, 28],
    "Small viper. Mild venom. Nocturnal.",
    "Mildly Venomous"
  ),
  venomous(
    "carpet-viper",
    "Saw-scaled Viper (West African)",
    "Echis ocellatus",
    "Viperidae",
    "Echis",
    85,
    "42/100",
    { ld50: 0.24, range: "0.2-0.4", method: "IV" },
    { dry: 25, qual: "Low" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Bleeding"],
      prog: ["Coagulopathy", "Renal damage"],
      crit: ["Death"],
    },
    "Very High",
    ["West Africa"],
    "Savannas, agricultural areas",
    [10, -5],
    "Major cause of snakebites in West Africa. Antivenom shortage in region.",
    "Moderately Venomous"
  ),
  venomous(
    "texas-coral-snake",
    "Texas Coral Snake",
    "Micrurus tener",
    "Elapidae",
    "Micrurus",
    68,
    "43/100",
    { ld50: 0.2, range: "0.15-0.3", method: "IV" },
    { dry: 5, qual: "Very Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Minimal pain", "Numbness"],
      prog: ["Paralysis"],
      crit: ["Respiratory failure rare"],
    },
    "Low",
    ["Southwestern United States", "Mexico"],
    "Scrubland, woodland",
    [29, -99],
    "Similar to eastern coral. Secretive. Small fangs limit venom delivery.",
    "Moderately Venomous"
  ),
  venomous(
    "blue-malayan-coral-snake",
    "Blue Malayan Coral Snake",
    "Calliophis bivirgatus",
    "Elapidae",
    "Calliophis",
    62,
    "44/100",
    { ld50: 0.5, range: "0.3-0.8", method: "IV" },
    { dry: 15, qual: "Low" },
    ["Neurotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Numbness"],
      prog: ["Paralysis", "Respiratory depression"],
      crit: ["Respiratory failure", "Rare death"],
    },
    "Low",
    ["Southeast Asia"],
    "Forests, plantations",
    [5, 102],
    "Long, slender. Red head and tail, blue-black dorsum. Potent neurotoxin; bites rare.",
    "Moderately Venomous"
  ),
  venomous(
    "twig-snake",
    "Twig Snake",
    "Thelotornis capensis",
    "Colubridae",
    "Thelotornis",
    58,
    "45/100",
    { ld50: 0.12, range: "0.08-0.18", method: "IV" },
    { dry: 8, qual: "Very Low" },
    ["Hemotoxic"],
    "Slow",
    {
      short: ["Minimal pain", "Nausea"],
      prog: ["Coagulopathy", "Bleeding"],
      crit: ["Hemorrhage", "Death; no antivenom"],
    },
    "Low",
    ["Sub-Saharan Africa"],
    "Savanna, woodland",
    [-15, 28],
    "Rear-fanged. Hemotoxic venom similar to boomslang; slow-acting. Bites rare.",
    "Moderately Venomous"
  ),
  venomous(
    "indian-coral-snake",
    "Indian Coral Snake",
    "Calliophis melanurus",
    "Elapidae",
    "Calliophis",
    55,
    "46/100",
    { ld50: 0.4, range: "0.3-0.6", method: "IV" },
    { dry: 5, qual: "Very Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Minimal pain", "Numbness"],
      prog: ["Paralysis"],
      crit: ["Respiratory failure rare"],
    },
    "Low",
    ["South Asia"],
    "Forests, scrubland",
    [15, 78],
    "Slender coral snake. Small fangs, low yield. India, Bangladesh, Sri Lanka.",
    "Moderately Venomous"
  ),
  venomous(
    "banded-malayan-coral-snake",
    "Banded Malayan Coral Snake",
    "Calliophis intestinalis",
    "Elapidae",
    "Calliophis",
    52,
    "47/100",
    { ld50: 0.35, range: "0.2-0.5", method: "IV" },
    { dry: 3, qual: "Very Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Minimal pain", "Numbness"],
      prog: ["Paralysis"],
      crit: ["Respiratory failure rare"],
    },
    "Low",
    ["Southeast Asia"],
    "Forests, Borneo to Singapore",
    [2, 112],
    "Small coral snake. Red vertebral stripe, red tail. Potent neurotoxin; low yield.",
    "Moderately Venomous"
  ),
];

const fixedSnakes = newSnakes;

// Add non-venomous and remaining moderately venomous
const moreSnakes = [
  nonvenomous("reticulated-python", "Reticulated Python", "Malayopython reticulatus", "Pythonidae", "Malayopython", "Low", ["Southeast Asia"], "Rainforests, rivers", [5, 110], "World's longest snake. Powerful constrictor. Generally avoids humans.", { maxLength: [6.9, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("burmese-python", "Burmese Python", "Python bivittatus", "Pythonidae", "Python", "Moderate", ["Southeast Asia", "Florida (introduced)"], "Forests, wetlands", [15, 100], "One of the five largest snakes. Invasive in Florida Everglades.", { maxLength: [5.7, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("green-anaconda", "Green Anaconda", "Eunectes murinus", "Boidae", "Eunectes", "Low", ["South America"], "Rivers, swamps, wetlands", [-5, -60], "Heaviest snake in the world. Semi-aquatic. Preys on caimans.", { maxLength: [5.2, "m"], diet: ["mammals", "birds", "fish", "reptiles"], constrictor: true }),
  nonvenomous("african-rock-python", "African Rock Python", "Python natalensis", "Pythonidae", "Python", "Low", ["Sub-Saharan Africa"], "Savannas, rocky areas, near water", [-15, 30], "Africa's largest snake. Aggressive when threatened.", { maxLength: [5.5, "m"], diet: ["mammals", "birds", "reptiles"], constrictor: true }),
  nonvenomous("carpet-python", "Carpet Python", "Morelia spilota", "Pythonidae", "Morelia", "Moderate", ["Australia", "New Guinea"], "Forests, woodlands, urban", [-25, 133], "Popular in pet trade. Variable patterns. Good climber.", { maxLength: [3.7, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("emerald-tree-boa", "Emerald Tree Boa", "Corallus caninus", "Boidae", "Corallus", "Low", ["South America"], "Rainforest canopy", [-5, -60], "Arboreal. Vibrant green with white markings. Nocturnal.", { maxLength: [2, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("rainbow-boa", "Brazilian Rainbow Boa", "Epicrates cenchria", "Boidae", "Epicrates", "Low", ["South America"], "Rainforests, tropical forests", [-5, -55], "Iridescent scales. Popular pet. Nocturnal.", { maxLength: [2, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("rosy-boa", "Rosy Boa", "Lichanura trivirgata", "Boidae", "Lichanura", "Low", ["Southwestern United States", "Mexico"], "Deserts, rocky canyons", [32, -115], "Small, docile boa. Popular pet. Three striped morphs.", { maxLength: [1, "m"], diet: ["rodents", "lizards"], constrictor: true }),
  nonvenomous("sand-boa", "Kenyan Sand Boa", "Eryx colubrinus", "Boidae", "Eryx", "Low", ["East Africa"], "Arid regions, sandy soil", [-1, 37], "Burrowing boa. Popular pet. Docile.", { maxLength: [0.8, "m"], diet: ["rodents"], constrictor: true }),
  nonvenomous("yellow-anaconda", "Yellow Anaconda", "Eunectes notaeus", "Boidae", "Eunectes", "Low", ["South America"], "Wetlands, marshes", [-25, -58], "Smaller than green anaconda. Semi-aquatic.", { maxLength: [4.2, "m"], diet: ["mammals", "birds", "reptiles"], constrictor: true }),
  nonvenomous("blood-python", "Blood Python", "Python brongersmai", "Pythonidae", "Python", "Low", ["Southeast Asia"], "Swamps, marshes", [5, 102], "Heavy-bodied. Variable red coloration. Sometimes aggressive.", { maxLength: [2.5, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("green-tree-python", "Green Tree Python", "Morelia viridis", "Pythonidae", "Morelia", "Low", ["Australia", "New Guinea"], "Rainforest canopy", [-5, 140], "Arboreal. Neonates are yellow or red. Popular pet.", { maxLength: [2, "m"], diet: ["mammals", "reptiles"], constrictor: true }),
  nonvenomous("indigo-snake", "Eastern Indigo Snake", "Drymarchon couperi", "Colubridae", "Drymarchon", "Low", ["Southeastern United States"], "Scrubland, flatwoods", [30, -83], "Longest native US snake. Non-venomous. Federally threatened.", { maxLength: [2.6, "m"], diet: ["mammals", "birds", "reptiles", "other snakes"] }),
  nonvenomous("black-racer", "Northern Black Racer", "Coluber constrictor", "Colubridae", "Coluber", "High", ["North America"], "Fields, meadows, woodlands, suburban yards", [38, -80], "Extremely fast, diurnal snake known for its 'periscoping' behavior. While the scientific name suggests constriction, it typically pins prey down rather than using true constriction.", { maxLength: [1.5, "m"], diet: ["rodents", "frogs", "lizards", "insects", "other snakes"] }),
  nonvenomous("black-rat-snake", "Black Rat Snake", "Pantherophis obsoletus", "Colubridae", "Pantherophis", "High", ["Eastern United States"], "Forests, farmland, suburbs", [38, -88], "Excellent climber. Eats rodents. Often found in barns.", { maxLength: [2.5, "m"], diet: ["rodents", "birds", "eggs"] }),
  nonvenomous("milk-snake", "Milk Snake", "Lampropeltis triangulum", "Colubridae", "Lampropeltis", "Moderate", ["Americas"], "Forests, farmland, suburban", [40, -95], "Mimics coral snake. Eats other snakes. Many subspecies.", { maxLength: [1.5, "m"], diet: ["rodents", "reptiles", "eggs"] }),
  nonvenomous("king-snake", "California Kingsnake", "Lampropeltis californiae", "Colubridae", "Lampropeltis", "Moderate", ["Western United States", "Mexico"], "Deserts, forests, suburban", [34, -118], "Eats rattlesnakes. Immune to pit viper venom. Popular pet.", { maxLength: [1.5, "m"], diet: ["rodents", "reptiles", "eggs"] }),
  nonvenomous("western-rat-snake", "Great Plains Rat Snake", "Pantherophis emoryi", "Colubridae", "Pantherophis", "Moderate", ["Central United States"], "Prairies, rocky areas", [37, -95], "Gray with dark blotches. Beneficial rodent control.", { maxLength: [1.5, "m"], diet: ["rodents", "birds"] }),
  nonvenomous("bullsnake", "Bullsnake", "Pituophis catenifer sayi", "Colubridae", "Pituophis", "Moderate", ["Central United States"], "Prairies, grasslands", [40, -100], "Large, hisses loudly when threatened. Eats rodents.", { maxLength: [2.3, "m"], diet: ["rodents", "birds", "eggs"] }),
  nonvenomous("water-snake", "Northern Water Snake", "Nerodia sipedon", "Colubridae", "Nerodia", "High", ["Eastern North America"], "Rivers, lakes, ponds", [42, -76], "Often mistaken for cottonmouth. Harmless. Aggressive when handled.", { maxLength: [1.4, "m"], diet: ["fish", "amphibians"] }),
  nonvenomous("ribbon-snake", "Eastern Ribbon Snake", "Thamnophis saurita", "Colubridae", "Thamnophis", "High", ["Eastern North America"], "Wetlands, streams", [42, -74], "Slender, fast. Related to garter snake. Eats amphibians.", { maxLength: [0.9, "m"], diet: ["amphibians", "fish"] }),
  nonvenomous("rough-green-snake", "Rough Green Snake", "Opheodrys aestivus", "Colubridae", "Opheodrys", "Moderate", ["Southeastern United States"], "Vegetation near water", [33, -87], "Bright green. Arboreal. Eats insects.", { maxLength: [1.1, "m"], diet: ["insects", "spiders"] }),
  nonvenomous("ringneck-snake", "Ring-necked Snake", "Diadophis punctatus", "Colubridae", "Diadophis", "Moderate", ["North America"], "Forests, woodlands", [40, -90], "Small, secretive. Yellow ring around neck. Mild venom harmless to humans.", { maxLength: [0.5, "m"], diet: ["salamanders", "earthworms", "slugs"] }),
  nonvenomous("worm-snake", "Eastern Worm Snake", "Carphophis amoenus", "Colubridae", "Carphophis", "Low", ["Eastern United States"], "Forests, under logs", [38, -85], "Small, fossorial. Harmless. Pink belly.", { maxLength: [0.3, "m"], diet: ["earthworms", "insects"] }),
  nonvenomous("smooth-green-snake", "Smooth Green Snake", "Opheodrys vernalis", "Colubridae", "Opheodrys", "Moderate", ["North America"], "Grasslands, meadows", [45, -95], "Bright green. Insectivorous. Declining in parts of range.", { maxLength: [0.6, "m"], diet: ["insects", "spiders"] }),
  nonvenomous("hognose-eastern", "Eastern Hognose Snake", "Heterodon platirhinos", "Colubridae", "Heterodon", "Moderate", ["Eastern United States"], "Sandy areas, forests", [40, -82], "Dramatic death feigning. Mild venom. Eats toads.", { maxLength: [1.1, "m"], diet: ["amphibians", "reptiles"] }),
  nonvenomous("european-rat-snake", "European Rat Snake", "Zamenis longissimus", "Colubridae", "Zamenis", "Low", ["Europe"], "Forests, farmland", [48, 10], "Large, non-venomous. Good climber. Eats rodents and birds.", { maxLength: [2.2, "m"], diet: ["rodents", "birds", "eggs"] }),
  nonvenomous("aesculapian-snake", "Aesculapian Snake", "Zamenis longissimus", "Colubridae", "Zamenis", "Low", ["Southern Europe", "Western Asia"], "Forests, rocky slopes", [45, 15], "Symbol of medicine. Agile climber. Harmless.", { maxLength: [2, "m"], diet: ["rodents", "birds"] }),
  nonvenomous("grass-snake", "Grass Snake", "Natrix natrix", "Colubridae", "Natrix", "High", ["Europe", "Western Asia"], "Wetlands, grasslands", [52, 10], "Most common snake in Europe. Plays dead when threatened.", { maxLength: [1.5, "m"], diet: ["amphibians", "fish"] }),
  nonvenomous("dice-snake", "Dice Snake", "Natrix tessellata", "Colubridae", "Natrix", "Moderate", ["Europe", "Western Asia"], "Rivers, lakes", [45, 15], "Semi-aquatic. Olive with dark spots. Harmless.", { maxLength: [1.3, "m"], diet: ["fish", "amphibians"] }),
  nonvenomous("asian-rat-snake", "Asian Rat Snake", "Ptyas mucosa", "Colubridae", "Ptyas", "Moderate", ["South Asia", "Southeast Asia"], "Forests, farmland, urban", [20, 77], "Long, fast. Often seen in villages. Eats rodents.", { maxLength: [3.7, "m"], diet: ["rodents", "birds", "other snakes"] }),
  nonvenomous("paradise-flying-snake", "Paradise Flying Snake", "Chrysopelea paradise", "Colubridae", "Chrysopelea", "Low", ["Southeast Asia"], "Forests", [5, 102], "Glides between trees. Mildly venomous but harmless to humans.", { maxLength: [1.2, "m"], diet: ["lizards", "birds"] }),
  // Additional snakes to reach 100
  nonvenomous("dumerils-boa", "Dumeril's Boa", "Acrantophis dumerili", "Boidae", "Acrantophis", "Low", ["Madagascar"], "Dry forests", [-20, 47], "Endemic to Madagascar. Heavily collected for pet trade.", { maxLength: [2.1, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("amazon-tree-boa", "Amazon Tree Boa", "Corallus hortulana", "Boidae", "Corallus", "Low", ["South America"], "Rainforest canopy", [-5, -60], "Arboreal. Variable coloration. Nocturnal hunter.", { maxLength: [2, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("woma-python", "Woma Python", "Aspidites ramsayi", "Pythonidae", "Aspidites", "Low", ["Australia"], "Arid regions, scrubland", [-25, 125], "Eats other reptiles. No heat-sensing pits. Threatened.", { maxLength: [2.5, "m"], diet: ["reptiles", "mammals"], constrictor: true }),
  nonvenomous("amethystine-python", "Amethystine Python", "Simalia amethistina", "Pythonidae", "Simalia", "Low", ["Australia", "New Guinea"], "Rainforests", [-15, 145], "One of the six largest snakes. Iridescent scales.", { maxLength: [5.5, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("olive-python", "Olive Python", "Liasis olivaceus", "Pythonidae", "Liasis", "Low", ["Australia"], "Rivers, gorges", [-18, 126], "Australia's second largest snake. Semi-aquatic.", { maxLength: [4, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("rubber-boa", "Rubber Boa", "Charina bottae", "Boidae", "Charina", "Low", ["Western North America"], "Forests, meadows", [45, -122], "Small, docile. Looks like rubber. Rarely bites.", { maxLength: [0.8, "m"], diet: ["rodents", "reptiles"], constrictor: true }),
  nonvenomous("diamond-python", "Diamond Python", "Morelia spilota spilota", "Pythonidae", "Morelia", "Moderate", ["Southeastern Australia"], "Forests, woodland", [-33, 151], "Subspecies of carpet python. Black with yellow spots.", { maxLength: [3, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("scrub-python", "Scrub Python", "Simalia kinghorni", "Pythonidae", "Simalia", "Low", ["Australia", "New Guinea"], "Rainforests", [-15, 145], "Large python. Variable pattern. Good climber.", { maxLength: [5, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("centralian-carpet-python", "Centralian Carpet Python", "Morelia bredli", "Pythonidae", "Morelia", "Low", ["Central Australia"], "Rocky ranges, gorges", [-24, 134], "Reddish coloration. Popular in captivity.", { maxLength: [2.5, "m"], diet: ["mammals", "birds"], constrictor: true }),
  nonvenomous("rough-scaled-python", "Rough-scaled Python", "Morelia carinata", "Pythonidae", "Morelia", "Low", ["Western Australia"], "Rocky outcrops", [-15, 128], "Keeled scales. Rare. Small population.", { maxLength: [2, "m"], diet: ["mammals"], constrictor: true }),
  venomous(
    "keelback",
    "Asian Keelback",
    "Rhabdophis subminiatus",
    "Colubridae",
    "Rhabdophis",
    45,
    "44/100",
    { ld50: 2.5, range: "1.5-4", method: "IV" },
    { dry: 15, qual: "Low" },
    ["Hemotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Bleeding"],
      prog: ["Coagulopathy", "Defibrinogenation"],
      crit: ["Severe hemorrhage", "Renal failure", "Death rare but documented"],
    },
    "Moderate",
    ["Southeast Asia"],
    "Forests, near water",
    [15, 105],
    "Rear-fanged. Medically significant venom: potent procoagulant and defibrinogenating. Severe coagulopathy and fatalities documented. Red neck when threatened.",
    "Moderately Venomous"
  ),
  nonvenomous("gopher-snake", "Gopher Snake", "Pituophis catenifer", "Colubridae", "Pituophis", "Moderate", ["Western North America"], "Deserts, grasslands", [36, -120], "Mimics rattlesnake when threatened. Beneficial rodent control.", { maxLength: [2.4, "m"], diet: ["rodents", "birds", "eggs"] }),
  nonvenomous("fox-snake", "Fox Snake", "Pantherophis vulpinus", "Colubridae", "Pantherophis", "Moderate", ["Central United States"], "Prairies, farmlands", [42, -88], "Copper head. Hisses and vibrates tail when threatened.", { maxLength: [1.7, "m"], diet: ["rodents", "birds"] }),
  nonvenomous("gray-rat-snake", "Gray Rat Snake", "Pantherophis spiloides", "Colubridae", "Pantherophis", "Moderate", ["Eastern United States"], "Forests, rocky hills", [36, -85], "Excellent climber. Gray with dark blotches.", { maxLength: [2.5, "m"], diet: ["rodents", "birds"] }),
  nonvenomous("pine-snake", "Northern Pine Snake", "Pituophis melanoleucus", "Colubridae", "Pituophis", "Low", ["Eastern United States"], "Pine forests, sandy areas", [35, -80], "Burrowing snake. Loud hiss. Declining in parts of range.", { maxLength: [2.3, "m"], diet: ["rodents", "birds"] }),
  nonvenomous("southern-hognose", "Southern Hognose Snake", "Heterodon simus", "Colubridae", "Heterodon", "Low", ["Southeastern United States"], "Sandy pine woods", [31, -82], "Rare. Feigns death. Eats toads.", { maxLength: [0.6, "m"], diet: ["amphibians"] }),
  nonvenomous("brown-snake", "Dekay's Brown Snake", "Storeria dekayi", "Colubridae", "Storeria", "High", ["Eastern North America"], "Gardens, forests, urban", [40, -75], "Tiny, harmless. Eats slugs and earthworms.", { maxLength: [0.5, "m"], diet: ["slugs", "earthworms", "insects"] }),
  nonvenomous("red-bellied-snake", "Red-bellied Snake", "Storeria occipitomaculata", "Colubridae", "Storeria", "Moderate", ["Eastern North America"], "Forests, wetlands", [45, -85], "Small, secretive. Red or orange belly.", { maxLength: [0.4, "m"], diet: ["slugs", "earthworms"] }),
  nonvenomous("smooth-snake", "Smooth Snake", "Coronella austriaca", "Colubridae", "Coronella", "Low", ["Europe"], "Heathland, scrub", [50, 5], "Rare in UK. Constricts lizards. Harmless.", { maxLength: [0.8, "m"], diet: ["lizards", "small mammals"] }),
  nonvenomous("four-lined-snake", "Four-lined Snake", "Elaphe quatuorlineata", "Colubridae", "Elaphe", "Low", ["Southern Europe"], "Forests, scrubland", [42, 15], "One of Europe's largest snakes. Four dark stripes.", { maxLength: [2.5, "m"], diet: ["rodents", "birds"] }),
  nonvenomous("montpellier-snake", "Montpellier Snake", "Malpolon monspessulanus", "Colubridae", "Malpolon", "Low", ["Mediterranean"], "Dry scrub, farmland", [40, 3], "Rear-fanged. Mild venom. Fast-moving.", { maxLength: [2, "m"], diet: ["lizards", "birds", "small mammals"] }),
  nonvenomous("cat-eyed-snake", "Cat-eyed Snake", "Leptodeira septentrionalis", "Colubridae", "Leptodeira", "Moderate", ["Central America", "South America"], "Forests, near water", [10, -85], "Nocturnal. Eats frogs. Mild venom harmless to humans.", { maxLength: [1, "m"], diet: ["amphibians"] }),
  nonvenomous("cuban-tree-snake", "Cuban Tree Snake", "Chironius carinatus", "Colubridae", "Chironius", "Low", ["Caribbean", "South America"], "Forests", [20, -75], "Arboreal. Fast. Harmless.", { maxLength: [2.5, "m"], diet: ["frogs", "lizards"] }),
  venomous(
    "rinkhals",
    "Rinkhals",
    "Hemachatus haemachatus",
    "Elapidae",
    "Hemachatus",
    76,
    "24/100",
    { ld50: 1.5, range: "1.1-2.0", method: "SC" },
    { dry: 80, qual: "Moderate" },
    ["Neurotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Local pain", "Swelling", "Ocular irritation from spit"],
      prog: ["Neurotoxicity", "Tissue damage", "Vomiting"],
      crit: ["Respiratory compromise", "Severe tissue necrosis"],
    },
    "Moderate",
    ["Southern Africa"],
    "Grasslands, scrub, agricultural edges",
    [-29, 24],
    "A distinctive spitting cobra relative that often feigns death. Bites can cause neurotoxic and cytotoxic envenoming.",
    "Highly Venomous"
  ),
  venomous(
    "mozambique-spitting-cobra",
    "Mozambique Spitting Cobra",
    "Naja mossambica",
    "Elapidae",
    "Naja",
    82,
    "18/100",
    { ld50: 0.8, range: "0.6-1.2", method: "SC" },
    { dry: 120, qual: "High" },
    ["Neurotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Ocular pain from spit"],
      prog: ["Progressive tissue injury", "Ptosis", "Nausea"],
      crit: ["Compartment syndrome", "Respiratory failure in severe cases"],
    },
    "High",
    ["Southern Africa", "East Africa"],
    "Savanna, villages, peri-urban habitats",
    [-18, 35],
    "One of Africa's most medically important spitting cobras. Frequently encountered near people.",
    "Highly Venomous"
  ),
  venomous(
    "blue-krait",
    "Blue Krait",
    "Bungarus candidus",
    "Elapidae",
    "Bungarus",
    88,
    "12/100",
    { ld50: 0.07, range: "0.05-0.1", method: "IV" },
    { dry: 8, qual: "Very Low" },
    ["Neurotoxic"],
    "Quick",
    {
      short: ["Minimal pain", "Abdominal cramps", "Ptosis"],
      prog: ["Descending paralysis"],
      crit: ["Respiratory failure", "Death without ventilation"],
    },
    "Moderate",
    ["Southeast Asia"],
    "Lowland forests, rice fields, rural settlements",
    [13, 101],
    "A highly neurotoxic krait responsible for severe nocturnal envenomings in Southeast Asia.",
    "Highly Venomous"
  ),
  venomous(
    "banded-sea-krait",
    "Banded Sea Krait",
    "Laticauda colubrina",
    "Elapidae",
    "Laticauda",
    74,
    "27/100",
    { ld50: 0.12, range: "0.08-0.2", method: "IV" },
    { dry: 10, qual: "Very Low" },
    ["Neurotoxic", "Myotoxic"],
    "Quick",
    {
      short: ["Mild pain", "Weakness", "Muscle aches"],
      prog: ["Generalized paralysis", "Myotoxic injury"],
      crit: ["Respiratory failure", "Rhabdomyolysis complications"],
    },
    "Low",
    ["Indo-Pacific", "Southeast Asia", "Oceania"],
    "Coral reefs, coastal islands, rocky shores",
    [-8, 123],
    "Amphibious sea krait with potent venom; usually docile but medically significant when handled.",
    "Venomous"
  ),
  venomous(
    "sidewinder",
    "Sidewinder",
    "Crotalus cerastes",
    "Viperidae",
    "Crotalus",
    60,
    "40/100",
    { ld50: 0.9, range: "0.7-1.3", method: "SC" },
    { dry: 18, qual: "Low" },
    ["Hemotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling"],
      prog: ["Ecchymosis", "Coagulopathy in moderate cases"],
      crit: ["Severe systemic envenoming is uncommon"],
    },
    "Moderate",
    ["Southwestern United States", "Mexico"],
    "Sandy deserts, dunes, arid scrub",
    [34, -114],
    "Desert rattlesnake known for sidewinding locomotion; bites are painful but often less severe than larger rattlesnakes.",
    "Moderately Venomous"
  ),
  venomous(
    "rhinoceros-viper",
    "Rhinoceros Viper",
    "Bitis nasicornis",
    "Viperidae",
    "Bitis",
    79,
    "22/100",
    { ld50: 1.2, range: "0.9-1.6", method: "SC" },
    { dry: 150, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Rapid swelling", "Blistering"],
      prog: ["Coagulopathy", "Tissue necrosis", "Hypotension"],
      crit: ["Hemorrhage", "Shock"],
    },
    "Low",
    ["Central Africa", "West Africa"],
    "Lowland rainforests, swamp forests",
    [1, 21],
    "Large forest viper with ornate colors and nasal scales. Delivers large venom yields and can cause severe envenoming.",
    "Highly Venomous"
  ),
  venomous(
    "belchers-sea-snake",
    "Belcher's Sea Snake",
    "Hydrophis belcheri",
    "Elapidae",
    "Hydrophis",
    78,
    "23/100",
    { ld50: 0.24, range: "0.18-0.4", method: "IV" },
    { dry: 6, qual: "Very Low" },
    ["Neurotoxic", "Myotoxic"],
    "Quick",
    {
      short: ["Often painless bite", "Mild weakness"],
      prog: ["Myalgia", "Paralysis", "Dark urine"],
      crit: ["Respiratory failure", "Rhabdomyolysis with renal injury"],
    },
    "Low",
    ["Indian Ocean", "Southeast Asia"],
    "Warm shallow coastal waters, offshore reefs",
    [8, 95],
    "Marine elapid with highly potent venom, though human bites are uncommon due to limited contact.",
    "Highly Venomous"
  ),
  nonvenomous("indian-python", "Indian Python", "Python molurus", "Pythonidae", "Python", "Moderate", ["South Asia"], "Grasslands, forests, wetlands, agricultural edges", [22, 78], "Large constrictor native to the Indian subcontinent. Frequently recognized in zoos and documentaries.", { maxLength: [4.5, "m"], diet: ["mammals", "birds", "reptiles"], constrictor: true }),
  venomous(
    "false-water-cobra",
    "False Water Cobra",
    "Hydrodynastes gigas",
    "Colubridae",
    "Hydrodynastes",
    38,
    "58/100",
    { ld50: 4.2, range: "3.0-6.0", method: "SC" },
    { dry: 18, qual: "Low" },
    ["Cytotoxic"],
    "Slow",
    {
      short: ["Pain", "Swelling", "Local bleeding"],
      prog: ["Extended edema", "Regional tissue irritation"],
      crit: ["Systemic severe effects are rare"],
    },
    "Moderate",
    ["South America"],
    "Wetlands, floodplains, riversides",
    [-17, -57],
    "Rear-fanged colubrid that hood-displays like a cobra. Bites are usually localized but can be medically significant.",
    "Mildly Venomous"
  ),
  venomous(
    "mangshan-pit-viper",
    "Mangshan Pit Viper",
    "Protobothrops mangshanensis",
    "Viperidae",
    "Protobothrops",
    73,
    "29/100",
    { ld50: 1.1, range: "0.8-1.5", method: "SC" },
    { dry: 120, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Bleeding"],
      prog: ["Coagulopathy", "Progressive tissue injury"],
      crit: ["Hemorrhage", "Shock in severe untreated bites"],
    },
    "Low",
    ["East Asia"],
    "Montane evergreen forests",
    [25, 113],
    "Rare, large pit viper endemic to China and well known among herpetologists for its striking camouflage.",
    "Venomous"
  ),
  venomous(
    "common-lancehead",
    "Common Lancehead",
    "Bothrops atrox",
    "Viperidae",
    "Bothrops",
    85,
    "15/100",
    { ld50: 1.1, range: "0.8-1.5", method: "IV" },
    { dry: 100, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Pain", "Swelling", "Bleeding"],
      prog: ["Coagulopathy", "Tissue necrosis"],
      crit: ["Hemorrhage", "Renal failure"],
    },
    "High",
    ["South America"],
    "Rainforests, forests, agricultural areas",
    [-1, -60],
    "Most common cause of snakebite in the Amazon region. Highly adaptable and prolific.",
    "Highly Venomous"
  ),
  venomous(
    "brazilian-lancehead",
    "Brazilian Lancehead",
    "Bothrops moojeni",
    "Viperidae",
    "Bothrops",
    88,
    "12/100",
    { ld50: 1.2, range: "0.9-1.6", method: "IV" },
    { dry: 200, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Rapid swelling", "Ecchymosis"],
      prog: ["Coagulopathy", "Extensive necrosis"],
      crit: ["Shock", "Renal failure"],
    },
    "High",
    ["South America"],
    "Cerrado, gallery forests, agricultural areas",
    [-15, -47],
    "Large and aggressive pit viper from central Brazil. Responsible for many serious bites.",
    "Highly Venomous"
  ),
  venomous(
    "urutu",
    "Urutu",
    "Bothrops alternatus",
    "Viperidae",
    "Bothrops",
    84,
    "18/100",
    { ld50: 1.3, range: "1.0-1.8", method: "IV" },
    { dry: 150, qual: "High" },
    ["Hemotoxic", "Cytotoxic"],
    "Quick",
    {
      short: ["Severe pain", "Swelling", "Blisters"],
      prog: ["Tissue destruction", "Coagulopathy"],
      crit: ["Hemorrhage", "Compartment syndrome"],
    },
    "Moderate",
    ["Southern South America"],
    "Swamps, marshes, grasslands",
    [-29, -57],
    "Famous for its cross-shaped markings and extremely painful, necrotic bites. Found in southern Brazil, Argentina, and Paraguay.",
    "Highly Venomous"
  ),
  venomous(
    "south-american-coral-snake",
    "South American Coral Snake",
    "Micrurus frontalis",
    "Elapidae",
    "Micrurus",
    75,
    "25/100",
    { ld50: 0.15, range: "0.1-0.2", method: "IV" },
    { dry: 15, qual: "Low" },
    ["Neurotoxic"],
    "Slow",
    {
      short: ["Minimal local pain", "Numbness"],
      prog: ["Ptosis", "Bulbar paralysis"],
      crit: ["Respiratory failure", "General paralysis"],
    },
    "Low",
    ["Southern South America"],
    "Open grasslands, pastures, and woodland margins",
    [-24, -55],
    "Highly venomous coral snake with classic tri-color bands. Secretive but extremely dangerous if it bites.",
    "Highly Venomous"
  ),
];

// Load existing snakes (used for merge + preserving optional fields)
const existingPath = join(__dirname, "../data/snakes/index.json");
const existing = JSON.parse(readFileSync(existingPath, "utf-8"));
const existingById = new Map<string, Record<string, unknown>>(
  (existing.snakes ?? []).map((s: any) => [s.id, s])
);

// Load manual edits
const manualEditsPath = join(__dirname, "../data/manualEdits.json");
let manualEdits = { deletedIds: [] as string[], addedSnakes: [] as any[], fieldOverrides: {} as any };
if (existsSync(manualEditsPath)) {
  manualEdits = JSON.parse(readFileSync(manualEditsPath, "utf-8"));
}

// Use all new venomous snakes (fixed ids already)
const allNew = fixedSnakes;

// Remove duplicate/erroneous entries; later entries override earlier (so updated definitions in allNew/moreSnakes win)
const removedSnakeIds = new Set<string>([
  "boomslang-southern",
  ...(manualEdits.deletedIds || []),
]);
const combined = [...existing.snakes, ...allNew, ...moreSnakes, ...(manualEdits.addedSnakes || [])].filter(
  (s: any) => !removedSnakeIds.has(s.id)
);
const byId = new Map<string, unknown>();
combined.forEach((s: any) => byId.set(s.id, s));
const unique = Array.from(byId.values()) as typeof combined;

// Data corrections and clinical overrides are in scripts/build/dataFixes.ts and scripts/build/clinicalFixes.ts
const corrected = unique.map((s: any) => {
  const fix = dataFixes[s.id];
  const clinical = clinicalFixes[s.id];
  const result = fix ? {
    ...s,
    venomPotency: {
      ...s.venomPotency,
      ld50: fix.ld50,
      ld50Range: fix.range,
      method: fix.method,
    },
    venomYield: {
      ...s.venomYield,
      ...(fix.dryYield > 0 ? { dryWeight: fix.dryYield } : {}),
      qualitative: fix.yieldQual,
    },
    ...(fix.dataQuality ? { dataQuality: fix.dataQuality } : {}),
  } : s;
  if (clinical) {
    result.clinicalData = {
      untreatedFatalityRate: { low: clinical.fatalityRate[0], high: clinical.fatalityRate[1] },
      ...(clinical.whoCategory ? { whoCategory: clinical.whoCategory } : {}),
      severity: clinical.severity,
    };
  }
  return result;
});

// Fang type from researched map only (no inference). Venomous snakes get fangType only if in fangTypes.
const withFangTypes = corrected.map((s: any) => {
  const isVenomous = s.venomClassification && s.venomClassification !== "Non-venomous";
  const fangType = isVenomous && fangTypes[s.id] ? fangTypes[s.id] : undefined;
  return { ...s, ...(fangType && { fangType }) };
});

// Normalize images for every snake: use new path structure and load attribution from file when present.
// Preserve existing gallery / galleryAttributions from the snake so user-added images (e.g. from
// "search for images") are not lost on rebuild. File-based data (attribution.json, gallery-metadata.json)
// is used as fallback when the snake has no gallery data.
const snakesWithNormalizedImages = withFangTypes.map((s: any) => {
  const prev = existingById.get(s.id) as Record<string, unknown> | undefined;
  const prevImages = (prev?.images as Record<string, unknown> | undefined) ?? undefined;
  const baseImages = img(s.id);
  const currentGallery = Array.isArray(s.images?.gallery) && s.images.gallery.length > 0 ? s.images.gallery : undefined;
  const currentGalleryAttributions =
    Array.isArray(s.images?.galleryAttributions) && s.images.galleryAttributions.length > 0
      ? s.images.galleryAttributions
      : undefined;
  const prevGallery =
    Array.isArray(prevImages?.gallery) && (prevImages.gallery as unknown[]).length > 0
      ? (prevImages.gallery as unknown[])
      : undefined;
  const prevGalleryAttributions =
    Array.isArray(prevImages?.galleryAttributions) && (prevImages.galleryAttributions as unknown[]).length > 0
      ? (prevImages.galleryAttributions as unknown[])
      : undefined;
  const prevAttribution = prevImages?.attribution as Record<string, unknown> | undefined;
  const shouldUsePrevAttribution =
    baseImages?.attribution?.source === "Placeholder" && prevAttribution;
  return {
    ...s,
    images: {
      ...baseImages,
      ...(shouldUsePrevAttribution ? { attribution: prevAttribution } : {}),
      ...(currentGallery ? { gallery: currentGallery } : {}),
      ...(currentGalleryAttributions ? { galleryAttributions: currentGalleryAttributions } : {}),
      ...(!currentGallery && prevGallery ? { gallery: prevGallery } : {}),
      ...(!currentGalleryAttributions && prevGalleryAttributions ? { galleryAttributions: prevGalleryAttributions } : {}),
    },
  };
});

// Compute danger scores from potency, yield, encounter, speed (log-transform formula) and assign ranks
const withScores = snakesWithNormalizedImages.map((s: any) =>
  computeDangerScoreForSnake(s as Snake)
);
const ranked = rankSnakes(withScores as Snake[]);

// ─── Enrich: continents, misidentification, fatalitySummary, symptoms, otherCommonNames ───
// This step runs on every build. Do not edit data/snakes/index.json by hand — run `bun run data:build`
// to regenerate. When adding a new snake: 1) add venomous()/nonvenomous() in newSnakes or moreSnakes;
// 2) if venomous, add to clinicalFixes (fatality rate, severity); 3) if rarely fatal, add to rarelyFatalIds below;
// 4) if commonly confused, add to data/commonly-misidentified.json; 5) for one primary alias only, add to otherCommonNamesMap.
function inferContinent(regions: string[]): Snake["continents"][number] {
  if (!regions?.length) return "North America";
  const r = regions.join(" ").toLowerCase();
  if (r.includes("united states") || r.includes("mexico") || r.includes("canada") || r.includes("central america") || r.includes("north america")) return "North America";
  if (r.includes("south america") || r.includes("amazon") || r.includes("brazil") || r.includes("argentina")) return "South America";
  if (r.includes("australia") || r.includes("new guinea") || r.includes("papua") || r.includes("oceania") || r.includes("indonesia") || r.includes("philippines")) return "Oceania";
  if (r.includes("africa") || r.includes("sahara") || r.includes("madagascar")) return "Africa";
  if (r.includes("europe") || r.includes("mediterranean") || r.includes("iberia")) return "Europe";
  if (r.includes("asia") || r.includes("india") || r.includes("china") || r.includes("japan") || r.includes("middle east") || r.includes("arabian")) return "Asia";
  return "North America";
}

let misidentificationMappings: Record<string, string[]> = {};
try {
  const cmPath = join(__dirname, "../data/commonly-misidentified.json");
  const cm = JSON.parse(readFileSync(cmPath, "utf-8"));
  misidentificationMappings = cm.mappings ?? {};
} catch (_) {}

// Only one snake gets "Also Known As" (single primary alias to keep UI minimal)
const otherCommonNamesMap: Record<string, string[]> = {
  "copperhead": ["Highland Moccasin"],
  "cottonmouth": ["Water Moccasin"],
};

/** Snakes that should always show the "Rarely Fatal" tag (very low untreated CFR). */
const rarelyFatalIds = new Set([
  "copperhead", "cottonmouth", "waglers-pit-viper", "night-adder", "common-adder", "massasauga", "red-bellied-black-snake",
]);

type SymptomBuckets = NonNullable<Snake["symptoms"]>;

function addUnique(list: string[], value: string): void {
  if (!value || list.includes(value)) return;
  list.push(value);
}

function normalizeTerm(input: string): string {
  return input.trim().toLowerCase().replace(/[;.,]+$/g, "");
}

function classifySymptom(term: string): { category: keyof SymptomBuckets; label: string } | null {
  const t = normalizeTerm(term);
  if (!t || t === "n/a" || t === "rare" || t === "rare systemic" || t === "rare death") return null;
  if (t.includes("death")) return null;

  if (/(nausea|vomit)/.test(t)) return { category: "gastrointestinal", label: "Nausea or vomiting" };
  if (/(abdominal|belly|cramp)/.test(t)) return { category: "gastrointestinal", label: "Abdominal pain or cramps" };

  if (/(respiratory failure|difficulty breathing|respiratory depression|respiratory compromise|breathing)/.test(t)) {
    return { category: "neurological", label: "Difficulty breathing" };
  }
  if (/(paralysis|bulbar|descending paralysis|generalized paralysis|general paralysis)/.test(t)) {
    return { category: "neurological", label: "Paralysis" };
  }
  if (/(ptosis|drooping eyelid)/.test(t)) return { category: "neurological", label: "Drooping eyelids" };
  if (/(difficulty speaking|difficulty swallowing|speaking\/swallowing|swallow)/.test(t)) {
    return { category: "neurological", label: "Trouble speaking or swallowing" };
  }
  if (/(numb|tingling|neurotoxicity)/.test(t)) return { category: "neurological", label: "Numbness or tingling" };
  if (/(dizz|vertigo)/.test(t)) return { category: "neurological", label: "Dizziness" };
  if (/(blurred vision|vision)/.test(t)) return { category: "neurological", label: "Blurred vision" };
  if (/(headache)/.test(t)) return { category: "neurological", label: "Headache" };
  if (/(weakness|drows)/.test(t)) return { category: "neurological", label: "Weakness or drowsiness" };

  if (/(coagul|clotting disorder|clotting)/.test(t)) return { category: "blood", label: "Coagulopathy" };
  if (/(internal bleeding|hemorrhage|haemorrhage|systemic bleeding|bleeding)/.test(t)) {
    return { category: "blood", label: "Internal bleeding" };
  }
  if (/(hypotension|low blood pressure)/.test(t)) return { category: "blood", label: "Low blood pressure" };
  if (/(shock)/.test(t)) return { category: "blood", label: "Circulatory shock" };

  if (/(rhabdomyolysis|muscle pain|muscle aches|myalgia|muscle)/.test(t)) {
    return { category: "muscle", label: "Muscle breakdown" };
  }
  if (/(dark urine)/.test(t)) return { category: "muscle", label: "Dark urine" };
  if (/(renal|kidney)/.test(t)) return { category: "muscle", label: "Kidney failure" };

  if (/(ocular|eye pain|blindness|irritation).*spit/.test(t)) {
    return { category: "localEffects", label: "Severe eye irritation (from spit)" };
  }
  if (/(compartment syndrome)/.test(t)) return { category: "localEffects", label: "Severe limb swelling and pressure" };
  if (/(necrosis)/.test(t)) return { category: "localEffects", label: "Necrosis" };
  if (/(tissue damage|tissue destruction|tissue injury|gangrene)/.test(t)) return { category: "localEffects", label: "Tissue damage" };
  if (/(blister)/.test(t)) return { category: "localEffects", label: "Blistering" };
  if (/(ecchymosis|bruis)/.test(t)) return { category: "localEffects", label: "Bruising" };
  if (/(swelling)/.test(t)) return { category: "localEffects", label: "Swelling" };
  if (/(pain|local)/.test(t)) return { category: "localEffects", label: "Pain at bite site" };

  return null;
}

function inferCauseOfDeath(term: string): string | null {
  const t = normalizeTerm(term);
  if (!t || t === "rarely fatal" || t === "rare" || t === "rare death") return null;
  if (/(respirat|breathing|paralysis|bulbar)/.test(t)) return "Respiratory failure";
  if (/(hemorrhage|haemorrhage|internal bleeding|systemic bleeding|coagul|bleeding)/.test(t)) return "Massive internal bleeding";
  if (/(shock|hypotension|cardiovascular collapse|cardiac arrest|circulatory)/.test(t)) {
    return "Circulatory shock";
  }
  if (/(renal|kidney)/.test(t)) return "Kidney failure";
  if (/(organ failure)/.test(t)) return "Multi-organ failure";
  return null;
}

function getProgressionTerms(snake: Record<string, unknown>): string[] {
  const sp = snake.symptomsProgression as Record<string, unknown> | undefined;
  if (!sp) return [];
  const short = Array.isArray(sp.short) ? sp.short : Array.isArray(sp.shortTerm) ? sp.shortTerm : [];
  const prog = Array.isArray(sp.prog) ? sp.prog : Array.isArray(sp.progressive) ? sp.progressive : [];
  const crit = Array.isArray(sp.crit) ? sp.crit : Array.isArray(sp.critical) ? sp.critical : [];
  return [...short, ...prog, ...crit].map((v) => String(v));
}

function normalizeClinicalSymptoms(snake: Record<string, unknown>): Record<string, unknown> {
  if (snake.venomClassification === "Non-venomous") return snake;

  const symptoms = (snake.symptoms ?? {}) as Record<string, unknown>;
  const symptomTerms = [
    ...(["localEffects", "neurological", "blood", "muscle", "gastrointestinal"] as const)
      .flatMap((k) => (Array.isArray(symptoms[k]) ? symptoms[k] : []))
      .map((v) => String(v)),
    ...getProgressionTerms(snake),
  ];
  if (symptomTerms.length === 0) return snake;

  const normalizedSymptoms: SymptomBuckets = {
    localEffects: [],
    neurological: [],
    blood: [],
    muscle: [],
    gastrointestinal: [],
  };
  for (const raw of symptomTerms) {
    const classified = classifySymptom(raw);
    if (!classified) continue;
    addUnique(normalizedSymptoms[classified.category], classified.label);
  }

  const causeTerms = [
    ...symptomTerms,
    ...(Array.isArray(snake.causesOfDeath) ? snake.causesOfDeath.map((v) => String(v)) : []),
  ];
  const normalizedCauses: string[] = [];
  for (const raw of causeTerms) {
    const cause = inferCauseOfDeath(raw);
    if (!cause) continue;
    addUnique(normalizedCauses, cause);
  }

  const out = { ...snake, symptoms: normalizedSymptoms };
  if (normalizedCauses.length > 0) {
    (out as { causesOfDeath?: string[] }).causesOfDeath = normalizedCauses;
  } else {
    delete (out as { causesOfDeath?: string[] }).causesOfDeath;
  }
  return out;
}

const enriched = ranked.map((s: any) => {
  const regions = s.distribution?.regions ?? [];
  const continents = Array.isArray(s.continents) && s.continents.length > 0 ? s.continents : [inferContinent(regions)];
  const manualFields = (manualEdits.fieldOverrides as any)?.[s.id] || {};
  const out = {
    ...s,
    continents,
    ...(misidentificationMappings[s.id] ? {
      commonlyMisidentifiedAs: misidentificationMappings[s.id],
      misidentificationRisk: "high" as const,
    } : {}),
    ...(otherCommonNamesMap[s.id] ? { otherCommonNames: otherCommonNamesMap[s.id] } : {}),
    ...manualFields,
  };
  // Rarely Fatal: from clinicalData (high < 2%) or explicit rarelyFatalIds
  const rate = out.clinicalData?.untreatedFatalityRate;
  const isRarelyFatal =
    rarelyFatalIds.has(s.id) ||
    (rate && rate.high >= 0 && rate.high < 2);
  if (isRarelyFatal && out.clinicalData) {
    out.clinicalData = { ...out.clinicalData, fatalitySummary: "Rarely Fatal" as const };
  } else if (isRarelyFatal && !out.clinicalData && s.venomClassification !== "Non-venomous") {
    out.clinicalData = {
      untreatedFatalityRate: { low: 0, high: 1 },
      severity: "Moderate",
      fatalitySummary: "Rarely Fatal" as const,
    };
  }
  return out;
});

// Preserve optional fields from existing JSON so rebuilds don't drop user-added or feature data.
// Adding a new feature that stores data on the snake? Add the field to the Snake type in lib/types.ts,
// then add the field name here so rebuilds preserve it.
const PRESERVED_FIELDS_FROM_EXISTING = [
  "firstAidInfo", "behaviorNotes", "conservationStatus", "accolades", "causesOfDeath",
  "dataQuality", "maxLength", "diet", "constrictor", "fangType",
  "otherCommonNames", "commonlyMisidentifiedAs", "misidentificationRisk",
  "countries", "continents",
] as const;
function pickPreserved(prev: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!prev) return {};
  const out: Record<string, unknown> = {};
  for (const key of PRESERVED_FIELDS_FROM_EXISTING) {
    if (prev[key] !== undefined && prev[key] !== null) out[key] = prev[key];
  }
  return out;
}

const withPreserved = enriched.map((s: any) => {
  const prev = existingById.get(s.id) as Record<string, unknown> | undefined;
  const preserved = pickPreserved(prev);
  if (Object.keys(preserved).length === 0) return s;
  return { ...s, ...preserved };
});

const normalizedClinical = withPreserved.map((s: any) => normalizeClinicalSymptoms(s));

const out = {
  lastUpdated: new Date().toISOString().split("T")[0],
  totalSnakes: normalizedClinical.length,
  snakes: normalizedClinical,
};

writeFileSync(join(__dirname, "../data/snakes/index.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${unique.length} snakes to data/snakes/index.json`);
