/**
 * Build-time script to scan all .gltf road tiles and categorize them by material name.
 * Run: node scripts/scan-tiles.mjs
 * Output: a JSON mapping of material categories to file paths.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tilesDir = path.resolve(__dirname, "../public/models/road tiles");
const outputFile = path.resolve(__dirname, "../src/data/tile-categories.json");

const files = fs.readdirSync(tilesDir).filter((f) => f.endsWith(".gltf"));

const categories = {
  Water: [],
  Grass: [],
  Stone: [],
  Asphalt: [],
  Dirt: [],
  Mixed: [],
};

for (const file of files) {
  const filePath = path.join(tilesDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const materials = content.match(/"name":\s*"([^"]+)"/g) || [];
  const names = materials.map((m) => m.replace(/"name":\s*"/, "").replace(/"$/, ""));

  if (names.includes("Water")) {
    categories.Water.push(file);
  } else if (names.includes("Asphalt")) {
    categories.Asphalt.push(file);
  } else if (names.includes("Grass") && names.includes("Alternate_Dirt")) {
    categories.Dirt.push(file);
  } else if (names.includes("Grass")) {
    categories.Grass.push(file);
  } else if (names.includes("Stone")) {
    categories.Stone.push(file);
  } else {
    categories.Mixed.push(file);
  }
}

// Write output
fs.writeFileSync(outputFile, JSON.stringify(categories, null, 2), "utf-8");
console.log("Tile categories written to", outputFile);
console.log("Summary:");
for (const [cat, files] of Object.entries(categories)) {
  console.log(`  ${cat}: ${files.length} files`);
}
