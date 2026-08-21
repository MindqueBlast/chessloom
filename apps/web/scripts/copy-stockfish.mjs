import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "node_modules", "stockfish", "bin");
const targetDir = path.join(root, "public", "stockfish");
const files = [
  "stockfish-18-lite-single.js",
  "stockfish-18-lite-single.wasm",
];

if (!fs.existsSync(sourceDir)) {
  console.warn("stockfish package not installed; skipping copy");
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
}

console.log(`Copied Stockfish lite-single assets to ${targetDir}`);
