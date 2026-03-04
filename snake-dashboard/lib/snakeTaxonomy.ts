import type { Snake } from "./types";

export interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  value?: number;
  id?: string;
  rank?: string;
  ghost?: boolean;
  majorGhost?: boolean;
}

interface TaxonDef {
  name: string;
  rank: string;
  children?: TaxonDef[];
  ghost?: boolean;
}

/**
 * Full modern Serpentes topology based on published molecular phylogenies.
 * Ghost families are included as stubs; shown only when Full Tree toggle is on.
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
        { name: "Leptotyphlopidae", rank: "family", ghost: true },
        { name: "Gerrhopilidae", rank: "family", ghost: true },
        { name: "Xenotyphlopidae", rank: "family", ghost: true },
        { name: "Anomalepididae", rank: "family", ghost: true },
      ],
    },
    {
      name: "Alethinophidia",
      rank: "infraorder",
      children: [
        {
          name: "Amerophidia",
          rank: "clade",
          children: [
            { name: "Anilidae", rank: "family", ghost: true },
            { name: "Tropidophiidae", rank: "family", ghost: true },
          ],
        },
        {
          name: "Afrophidia",
          rank: "clade",
          children: [
            {
              name: "Uropeltoidea",
              rank: "clade",
              children: [
                { name: "Uropeltidae", rank: "family", ghost: true },
                { name: "Anomochilidae", rank: "family", ghost: true },
                { name: "Cylindrophiidae", rank: "family", ghost: true },
              ],
            },
            {
              name: "Macrostomata",
              rank: "clade",
              children: [
                {
                  name: "Pythonoidea",
                  rank: "clade",
                  children: [
                    { name: "Pythonidae", rank: "family" },
                    { name: "Loxocemidae", rank: "family", ghost: true },
                    { name: "Xenopeltidae", rank: "family", ghost: true },
                  ],
                },
                {
                  name: "Booidea",
                  rank: "clade",
                  children: [
                    { name: "Boidae", rank: "family" },
                    { name: "Calabariidae", rank: "family", ghost: true },
                    { name: "Candoiidae", rank: "family", ghost: true },
                    { name: "Charinidae", rank: "family", ghost: true },
                    { name: "Erycidae", rank: "family", ghost: true },
                    { name: "Sanziniidae", rank: "family", ghost: true },
                  ],
                },
                {
                  name: "Caenophidia",
                  rank: "clade",
                  children: [
                    { name: "Acrochordidae", rank: "family", ghost: true },
                    {
                      name: "Colubroides",
                      rank: "clade",
                      children: [
                        { name: "Xenodermidae", rank: "family", ghost: true },
                        { name: "Pareidae", rank: "family", ghost: true },
                        { name: "Viperidae", rank: "family" },
                        { name: "Homalopsidae", rank: "family", ghost: true },
                        {
                          name: "Colubroidea",
                          rank: "clade",
                          children: [
                            { name: "Colubridae", rank: "family" },
                            {
                              name: "Elapoidea",
                              rank: "clade",
                              children: [
                                { name: "Pseudaspididae", rank: "family", ghost: true },
                                { name: "Lamprophiidae", rank: "family", ghost: true },
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

/** Ghost families with a taxonomy_descriptions entry — shown with info box on hover. */
const MAJOR_GHOST_FAMILIES = new Set([
  "Leptotyphlopidae",
  "Tropidophiidae",
  "Xenopeltidae",
  "Acrochordidae",
  "Homalopsidae",
  "Lamprophiidae",
]);

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
    ghost: def.ghost,
    majorGhost: def.ghost && MAJOR_GHOST_FAMILIES.has(def.name),
  };

  if (def.rank === "family") {
    if (def.ghost) {
      node.value = 0;
      return node;
    }
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

/**
 * Recursively prunes ghost leaf nodes and any internal nodes that
 * become empty as a result. Used when Full Tree toggle is off.
 */
export function filterGhostNodes(node: HierarchyNode): HierarchyNode | null {
  if (node.ghost) return null;
  if (!node.children) return node;

  const filteredChildren = node.children
    .map(filterGhostNodes)
    .filter((c): c is HierarchyNode => c !== null && (c.children ? c.children.length > 0 : true));

  if (filteredChildren.length === 0) return null;
  return { ...node, children: filteredChildren };
}

/** Build a single family node — used by the snake detail page mini-tree. */
export function buildFamilyNode(familyName: string, familySnakes: Snake[]): HierarchyNode {
  return {
    name: familyName,
    rank: "family",
    children: buildFamilyChildren(familySnakes),
  };
}
