import type { Snake } from "./types";

export interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  value?: number;
  id?: string;
  rank?: string;
}

interface TaxonDef {
  name: string;
  rank: string;
  children?: TaxonDef[];
}

/**
 * Modern Serpentes topology based on published molecular phylogenies.
 * Only families represented in the snake database are included.
 * References: Zaher et al. 2019, Pyron et al. 2013, Reynolds et al. 2014.
 */
const FULL_TOPOLOGY: TaxonDef = {
  name: "Serpentes",
  rank: "suborder",
  children: [
    {
      name: "Scolecophidia",
      rank: "infraorder",
      children: [
        { name: "Typhlopidae", rank: "family" },
      ],
    },
    {
      name: "Alethinophidia",
      rank: "infraorder",
      children: [
        {
          name: "Afrophidia",
          rank: "clade",
          children: [
            {
              name: "Macrostomata",
              rank: "clade",
              children: [
                {
                  name: "Pythonoidea",
                  rank: "clade",
                  children: [
                    { name: "Pythonidae", rank: "family" },
                  ],
                },
                {
                  name: "Booidea",
                  rank: "clade",
                  children: [
                    { name: "Boidae", rank: "family" },
                  ],
                },
                {
                  name: "Caenophidia",
                  rank: "clade",
                  children: [
                    {
                      name: "Colubroides",
                      rank: "clade",
                      children: [
                        { name: "Viperidae", rank: "family" },
                        {
                          name: "Colubroidea",
                          rank: "clade",
                          children: [
                            { name: "Colubridae", rank: "family" },
                            {
                              name: "Elapoidea",
                              rank: "clade",
                              children: [
                                { name: "Atractaspididae", rank: "family" },
                                { name: "Elapidae", rank: "family" },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function buildFullSnakeHierarchy(snakes: Snake[]): HierarchyNode {
  const snakesByFamily = new Map<string, Snake[]>();
  for (const snake of snakes) {
    const list = snakesByFamily.get(snake.family) ?? [];
    list.push(snake);
    snakesByFamily.set(snake.family, list);
  }
  return buildNode(FULL_TOPOLOGY, snakesByFamily);
}

function buildNode(def: TaxonDef, snakesByFamily: Map<string, Snake[]>): HierarchyNode {
  const node: HierarchyNode = {
    name: def.name,
    rank: def.rank,
  };

  if (def.rank === "family") {
    const familySnakes = snakesByFamily.get(def.name) ?? [];
    node.children = buildFamilyChildren(familySnakes);
    return node;
  }

  if (def.children) {
    node.children = def.children.map((child) => buildNode(child, snakesByFamily));
  }
  return node;
}

function buildFamilyChildren(snakes: Snake[]): HierarchyNode[] {
  const genusMap = new Map<string, Snake[]>();
  for (const snake of snakes) {
    const list = genusMap.get(snake.genus) ?? [];
    list.push(snake);
    genusMap.set(snake.genus, list);
  }
  return Array.from(genusMap.keys()).sort().map((genusName) => {
    const genusSnakes = genusMap.get(genusName)!;
    return {
      name: genusName,
      rank: "genus",
      children: genusSnakes.map((s) => ({
        name: s.commonName,
        value: 1,
        id: s.id,
        rank: "species" as const,
      })),
    };
  });
}

/** Build a single family node — used by the snake detail page mini-tree. */
export function buildFamilyNode(familyName: string, familySnakes: Snake[]): HierarchyNode {
  return {
    name: familyName,
    rank: "family",
    children: buildFamilyChildren(familySnakes),
  };
}
