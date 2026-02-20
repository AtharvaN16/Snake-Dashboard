import type { Snake } from "./types";

/**
 * Node shape used by the phylogeny sunburst (D3 partition).
 * Exported so PhylogenyChart and hierarchy builder can share it.
 */
export interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  value?: number;
  id?: string;
  rank?: string;
}

/**
 * Reference taxonomy: Suborder Serpentes down to family.
 * Based on Reptile Database / modern snake phylogeny.
 * - Scolecophidia: blind snakes (Typhlopidae, Leptotyphlopidae, etc.)
 * - Alethinophidia: all other snakes
 *   - Henophidia (boas, pythons, etc.): Boidae, Pythonidae, ...
 *   - Caenophidia (advanced snakes): Colubridae, Elapidae, Viperidae, ...
 */
const INFRAORDER_SCOLEcOPHIDIA = "Scolecophidia";
const INFRAORDER_ALETHINOPHIDIA = "Alethinophidia";
const CLADE_HENOPHIDIA = "Henophidia";
const CLADE_CAENOPHIDIA = "Caenophidia";

/** Family -> clade (under Alethinophidia). Only families present in our DB are listed. */
const FAMILY_TO_CLADE: Record<string, string> = {
  Boidae: CLADE_HENOPHIDIA,
  Pythonidae: CLADE_HENOPHIDIA,
  Atractaspididae: CLADE_CAENOPHIDIA,
  Colubridae: CLADE_CAENOPHIDIA,
  Elapidae: CLADE_CAENOPHIDIA,
  Viperidae: CLADE_CAENOPHIDIA,
};

/** Fixed order for infraorders and clades for stable layout. */
const INFRAORDER_ORDER = [INFRAORDER_SCOLEcOPHIDIA, INFRAORDER_ALETHINOPHIDIA];
const CLADE_ORDER = [CLADE_HENOPHIDIA, CLADE_CAENOPHIDIA];

/**
 * Build the full snake hierarchy from Suborder Serpentes down to species,
 * using the reference taxonomy and attaching the given snakes as leaves.
 */
export function buildFullSnakeHierarchy(snakes: Snake[]): HierarchyNode {
  const root: HierarchyNode = {
    name: "Serpentes",
    children: [],
    rank: "suborder",
  };

  // Scolecophidia
  const scolecophidia: HierarchyNode = {
    name: INFRAORDER_SCOLEcOPHIDIA,
    children: [],
    rank: "infraorder",
  };
  
  // Families under Scolecophidia
  const scolecophidiaFamilies = ["Typhlopidae", "Leptotyphlopidae", "Gerrhopilidae", "Xenotyphlopidae", "Anomalepididae"];
  for (const familyName of scolecophidiaFamilies.sort()) {
    const familySnakes = snakes.filter((s) => s.family === familyName);
    if (familySnakes.length > 0) {
      const familyNode = buildFamilyNode(familyName, familySnakes);
      scolecophidia.children!.push(familyNode);
    }
  }
  root.children!.push(scolecophidia);

  // Alethinophidia -> Henophidia + Caenophidia -> families -> genera -> species
  const alethinophidia: HierarchyNode = {
    name: INFRAORDER_ALETHINOPHIDIA,
    children: [],
    rank: "infraorder",
  };

  const cladeToFamilies = new Map<string, string[]>();
  for (const [family, clade] of Object.entries(FAMILY_TO_CLADE)) {
    if (!cladeToFamilies.has(clade)) {
      cladeToFamilies.set(clade, []);
    }
    cladeToFamilies.get(clade)!.push(family);
  }

  for (const cladeName of CLADE_ORDER) {
    const families = cladeToFamilies.get(cladeName) ?? [];
    if (families.length === 0) continue;

    const cladeNode: HierarchyNode = {
      name: cladeName,
      children: [],
      rank: "clade",
    };

    for (const familyName of families.sort()) {
      const familySnakes = snakes.filter((s) => s.family === familyName);
      const familyNode = buildFamilyNode(familyName, familySnakes);
      cladeNode.children!.push(familyNode);
    }

    alethinophidia.children!.push(cladeNode);
  }

  root.children!.push(alethinophidia);

  return root;
}

export function buildFamilyNode(familyName: string, familySnakes: Snake[]): HierarchyNode {
  const familyNode: HierarchyNode = {
    name: familyName,
    children: [],
    rank: "family",
  };

  const genusMap = new Map<string, Snake[]>();
  for (const snake of familySnakes) {
    const list = genusMap.get(snake.genus) ?? [];
    list.push(snake);
    genusMap.set(snake.genus, list);
  }

  const genera = Array.from(genusMap.keys()).sort();
  for (const genusName of genera) {
    const genusSnakes = genusMap.get(genusName)!;
    const genusNode: HierarchyNode = {
      name: genusName,
      children: genusSnakes.map((s) => ({
        name: s.commonName,
        value: 1,
        id: s.id,
        rank: "species" as const,
      })),
      rank: "genus",
    };
    familyNode.children!.push(genusNode);
  }

  return familyNode;
}
