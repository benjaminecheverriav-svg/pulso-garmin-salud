// Estándar del proyecto: ningún archivo de código supera las 200 líneas.
// Uso: npm run check:lines
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_LINES = 200;
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".py"]);
const IGNORED = new Set(["node_modules", ".next", "dist", ".git", "data", ".turbo"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORED.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(name)) && !name.endsWith(".d.ts")) yield path;
  }
}

const offenders = [];
let files = 0;
for (const file of walk(ROOT)) {
  files++;
  const lines = readFileSync(file, "utf8").split("\n").length;
  if (lines > MAX_LINES) offenders.push([relative(ROOT, file), lines]);
}

if (offenders.length) {
  console.error(`✗ ${offenders.length} archivo(s) superan ${MAX_LINES} líneas:`);
  for (const [file, lines] of offenders) console.error(`  ${file}: ${lines}`);
  process.exit(1);
}
console.log(`✓ ${files} archivos revisados, todos con ${MAX_LINES} líneas o menos.`);
