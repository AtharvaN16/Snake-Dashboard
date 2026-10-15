/**
 * Extracts embedded PNGs from the paper/tape SVG files, applies brightness &
 * saturation adjustments, and saves optimised WebP files to public/paper/.
 *
 * Run with:  bun run scripts/processPaperAssets.ts
 */

import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const ASSETS_DIR = join(ROOT, "design-assets"); // source SVGs live here
const OUT_DIR = join(ROOT, "public", "paper");

mkdirSync(OUT_DIR, { recursive: true });

function extractBase64FromSvg(svgPath: string): Buffer {
  console.log(`Reading ${svgPath} ...`);
  const svg = readFileSync(svgPath, "utf8");
  const match = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) throw new Error(`No embedded PNG found in ${svgPath}`);
  return Buffer.from(match[1], "base64");
}

async function processPaper() {
  const buf = extractBase64FromSvg(join(ASSETS_DIR, "Paper 48.svg"));

  // brightness 1.5 → lightness multiplier 1.5 in Sharp modulate
  // saturation 0.06 → heavily desaturated (almost greyscale)
  const outPath = join(OUT_DIR, "paper-48.webp");
  await sharp(buf)
    .modulate({ brightness: 1.5, saturation: 0.08 })
    .webp({ quality: 85 })
    .toFile(outPath);

  console.log(`✓ paper-48.webp written`);
}

async function processTape(filename: string, outName: string) {
  const buf = extractBase64FromSvg(join(ASSETS_DIR, filename));

  const outPath = join(OUT_DIR, outName);
  await sharp(buf)
    .webp({ quality: 85 })
    .toFile(outPath);

  console.log(`✓ ${outName} written`);
}

await processPaper();
await processTape("Scotch Tape 09.svg", "scotch-tape-09.webp");
await processTape("Scotch Tape 12.svg", "scotch-tape-12.webp");

console.log("\nDone! Update page references from .svg → .webp and remove CSS filter.");
