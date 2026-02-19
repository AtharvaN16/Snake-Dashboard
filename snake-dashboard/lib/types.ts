// Type definitions for snake data structure
import type { Polygon, MultiPolygon } from "geojson";

export interface VenomPotency {
  ld50: number;
  ld50Range: string;
  unit: string;
  method: "IV" | "SC" | "IM" | "IP";
  /** SC-equivalent value when normalized from IV/IP (computed) */
  ld50Normalized?: number;
  /** True if conversion factor was applied */
  normalized?: boolean;
}

export interface VenomYield {
  dryWeight?: number; // in mg
  wetVolume?: number; // in ml
  qualitative: "Extremely High" | "High" | "Moderate" | "Low" | "Very Low";
}

export interface ClinicalData {
  /** Untreated case fatality rate range (percentage, 0-100) */
  untreatedFatalityRate: { low: number; high: number };
  /** WHO medical importance category */
  whoCategory?: 1 | 2;
  /** Overall clinical envenomation severity */
  severity: "Life-threatening" | "Severe" | "Moderate" | "Mild" | "Negligible";
}

export interface DangerScoreComponents {
  clinicalScore: number;
  potencyScore: number;
  yieldScore: number;
  encounterScore: number;
  speedScore: number;
}

export interface SymptomsProgression {
  shortTerm: string[];
  progressive: string[];
  critical: string[];
}

/** Range geometry (RFC 7946 GeoJSON). When present, used to draw the distribution overlay. */
export type RangeGeometry = Polygon | MultiPolygon;

export interface Distribution {
  regions: string[];
  habitat: string;
  coordinates?: Array<{ lat: number; lng: number }>;
  /** Inline range polygon(s) for the distribution map. */
  geometry?: RangeGeometry;
  /** Path to a static GeoJSON file (e.g. under public/geojson/ranges/<id>.json). Loaded at runtime. */
  rangeGeoJsonPath?: string;
}

export interface ImageAttribution {
  photographer?: string;
  source: string;
  license: string;
  url?: string;
  sourceUrl?: string;
  licenseUrl?: string;
}

export interface SnakeImages {
  primary: string;           // Main display image
  thumbnail: string;         // Card thumbnail
  gallery?: string[];        // Optional: additional images showing features
  attribution: ImageAttribution;
  galleryAttributions?: ImageAttribution[]; // Optional: attributions for gallery images if different from primary
}

export type VenomType =
  | "Hemotoxic"
  | "Neurotoxic"
  | "Cytotoxic"
  | "Myotoxic";

export type VenomSpeed = "Extremely quick" | "Quick" | "Slow";

export interface Snake {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  continent:
    | "Africa"
    | "Asia"
    | "Europe"
    | "North America"
    | "South America"
    | "Oceania"
    | "Antarctica";
  subregions: string[];
  
  // Danger scoring
  dangerScore: number;
  dangerRank: string;
  dangerScoreComponents?: DangerScoreComponents;
  venomClassification:
    | "Highly Venomous"
    | "Venomous"
    | "Moderately Venomous"
    | "Mildly Venomous"
    | "Non-venomous";
  
  // Venom characteristics (optional for non-venomous)
  venomPotency?: VenomPotency;
  venomYield?: VenomYield;
  venomTypes?: VenomType[];
  venomSpeed?: VenomSpeed;
  
  // Clinical outcome data (venomous only)
  clinicalData?: ClinicalData;

  // Medical information (optional for non-venomous)
  symptomsProgression?: SymptomsProgression;
  humanEncounterChance: "Low" | "Moderate" | "High" | "Very High";
  firstAidInfo?: string;
  
  // Geographic data
  distribution: Distribution;
  
  // Media
  images: SnakeImages;
  
  // Additional info
  description?: string;
  behaviorNotes?: string;
  conservationStatus?: string;
  sources?: string[];

  /** Snake IDs of species this snake is often confused with (for detail page "Commonly misidentified as"). */
  commonlyMisidentifiedAs?: string[];

  /**
   * Indicates a high real-world risk of misidentification — same habitat, overlapping range,
   * and the confusion has documented safety consequences (e.g. venomous ↔ non-venomous).
   * When true, a prominent warning banner is shown at the top of the detail page.
   */
  misidentificationRisk?: "high";

  /** Data quality for danger scoring */
  dataQuality?: "measured" | "estimated" | "insufficient";

  // For non-venomous / constrictors
  maxLength?: { value: number; unit: "cm" | "m" };
  diet?: string[];
  constrictor?: boolean;
}

export interface SnakeDatabase {
  lastUpdated: string;
  totalSnakes: number;
  snakes: Snake[];
}
