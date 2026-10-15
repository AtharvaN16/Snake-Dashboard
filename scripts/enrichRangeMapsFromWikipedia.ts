/**
 * Enrich data/rangeMaps/wikidataRangeMaps.json using Wikipedia infobox range map fields.
 *
 * This script tries to find `range_map` (and common variants) in article wikitext
 * for missing snakes, first by scientific name, then common name.
 *
 * Usage:
 *   npx tsx scripts/enrichRangeMapsFromWikipedia.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

type Snake = {
  id: string;
  scientificName: string;
  commonName: string;
};

type MapIndex = Record<string, string>;

const SNAKES_PATH = resolve(process.cwd(), "data/snakes/index.json");
const MAP_INDEX_PATH = resolve(process.cwd(), "data/rangeMaps/wikidataRangeMaps.json");

function cleanFileName(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\[\[/, "").replace(/\]\]$/, "");
  s = s.replace(/^File:/i, "");
  s = s.replace(/^Image:/i, "");
  s = s.split("|")[0].trim();
  return s;
}

function extractRangeMapFileName(wikitext: string): string | null {
  const patterns = [
    /^\|\s*range_map\s*=\s*(.+)$/gim,
    /^\|\s*range map\s*=\s*(.+)$/gim,
    /^\|\s*map\s*=\s*(.+)$/gim,
  ];

  for (const p of patterns) {
    const m = p.exec(wikitext);
    if (m?.[1]) {
      const name = cleanFileName(m[1]);
      if (name && /\.(svg|png|jpg|jpeg)$/i.test(name)) return name;
    }
  }
  return null;
}

async function fetchWikiText(title: string): Promise<string | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "snake-dashboard-range-map-bot/1.0 (local build script)" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    query?: { pages?: Array<{ missing?: boolean; revisions?: Array<{ slots?: { main?: { content?: string } } }> }> };
  };
  const page = json.query?.pages?.[0];
  if (!page || page.missing) return null;
  return page.revisions?.[0]?.slots?.main?.content ?? null;
}

async function searchWikipediaTitle(query: string): Promise<string | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("format", "json");
  url.searchParams.set("srlimit", "1");
  url.searchParams.set("srsearch", query);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "snake-dashboard-range-map-bot/1.0 (local build script)" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { query?: { search?: Array<{ title?: string }> } };
  return json.query?.search?.[0]?.title ?? null;
}

async function main() {
  const snakesRaw = JSON.parse(readFileSync(SNAKES_PATH, "utf-8")) as { snakes: Snake[] };
  const snakes = snakesRaw.snakes;
  const mapIndex = JSON.parse(readFileSync(MAP_INDEX_PATH, "utf-8")) as MapIndex;

  let added = 0;

  for (const snake of snakes) {
    if (mapIndex[snake.id]) continue;

    const titles = [snake.scientificName, snake.commonName];
    let found: string | null = null;

    for (const t of titles) {
      const wikiText = await fetchWikiText(t);
      if (!wikiText) continue;
      const file = extractRangeMapFileName(wikiText);
      if (!file) continue;
      found = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
      break;
    }

    if (!found) {
      const searched = await searchWikipediaTitle(`"${snake.scientificName}" snake`);
      if (searched) {
        const wikiText = await fetchWikiText(searched);
        const file = wikiText ? extractRangeMapFileName(wikiText) : null;
        if (file) {
          found = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
        }
      }
    }

    if (!found) {
      const searched = await searchWikipediaTitle(`"${snake.commonName}" snake`);
      if (searched) {
        const wikiText = await fetchWikiText(searched);
        const file = wikiText ? extractRangeMapFileName(wikiText) : null;
        if (file) {
          found = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
        }
      }
    }

    if (found) {
      mapIndex[snake.id] = found;
      added++;
    }
  }

  writeFileSync(MAP_INDEX_PATH, JSON.stringify(mapIndex, null, 2) + "\n", "utf-8");
  console.log(`Added ${added} new maps.`);
  console.log(`Total coverage: ${Object.keys(mapIndex).length}/${snakes.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

