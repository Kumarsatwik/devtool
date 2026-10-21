/**
 * Dependency graph and refactor blast-radius guard.
 *
 * Parses static imports, re-exports, dynamic imports, and require() calls in
 * src/**\/*.{ts,tsx}, resolves local aliases, then reports:
 *   - import cycles (fails)
 *   - lib -> components/app edges (fails)
 *   - cross-feature component imports (warns)
 *   - extensionless relative imports inside src/lib (warns until normalized)
 *   - transitive dependents of files changed against a base ref
 *
 * Usage: node scripts/blast-radius.mjs [--base <git-ref>]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = path.join(ROOT, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function toRel(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join("/");
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, files);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(abs);
    }
  }
  return files;
}

function parseImports(source) {
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\w*\s{},$]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

function resolveSpecifier(importerRel, specifier) {
  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(path.join(ROOT, importerRel)), specifier);
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];

  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  if (!found) return null;
  const rel = toRel(found);
  return rel.startsWith("src/") ? rel : null;
}

function componentFeature(rel) {
  const match = rel.match(/^src\/components\/([^/]+)\//);
  return match ? match[1] : null;
}

function findCycles(graph) {
  const state = new Map();
  const stack = [];
  const cycles = [];

  function visit(node) {
    state.set(node, "visiting");
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const nextState = state.get(next);
      if (nextState === "visiting") {
        const start = stack.indexOf(next);
        cycles.push([...stack.slice(start), next]);
      } else if (!nextState) {
        visit(next);
      }
    }
    stack.pop();
    state.set(node, "done");
  }

  for (const node of graph.keys()) {
    if (!state.get(node)) visit(node);
  }
  return cycles;
}

function gitChangedFiles(base) {
  if (!base) return { files: [], reason: "no base ref supplied" };
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { files: output.split("\n").filter(Boolean), reason: base };
  } catch {
    return { files: [], reason: `base ref "${base}" is not available` };
  }
}

function main() {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : "main";

  const files = walk(SRC).map(toRel).sort();
  const graph = new Map();
  const reverse = new Map();
  const extensionWarnings = [];
  const boundaryViolations = [];
  const crossFeatureWarnings = [];

  for (const rel of files) {
    graph.set(rel, new Set());
    reverse.set(rel, new Set());
  }

  for (const rel of files) {
    const source = readFileSync(path.join(ROOT, rel), "utf8");
    for (const specifier of parseImports(source)) {
      const target = resolveSpecifier(rel, specifier);
      if (!target) continue;

      graph.get(rel).add(target);
      reverse.get(target)?.add(rel);

      const isLib = rel.startsWith("src/lib/");
      const targetIsUp = target.startsWith("src/components/") || target.startsWith("src/app/");
      if (isLib && targetIsUp) {
        boundaryViolations.push(`${rel} -> ${target}`);
      }

      if (isLib && specifier.startsWith(".") && !specifier.endsWith(".ts")) {
        extensionWarnings.push(`${rel} -> ${specifier}`);
      }

      const fromFeature = componentFeature(rel);
      const toFeature = componentFeature(target);
      const sharedFeatures = new Set(["ui", "shell"]);
      if (
        fromFeature &&
        toFeature &&
        fromFeature !== toFeature &&
        !sharedFeatures.has(fromFeature) &&
        !sharedFeatures.has(toFeature)
      ) {
        crossFeatureWarnings.push(`${rel} -> ${target}`);
      }
    }
  }

  const cycles = findCycles(graph);
  const { files: changed, reason } = gitChangedFiles(base);

  const changedInGraph = changed.filter((file) => graph.has(file));
  const dependents = new Map();
  for (const file of changedInGraph) {
    const seen = new Set();
    const queue = [...(reverse.get(file) ?? [])];
    while (queue.length) {
      const next = queue.shift();
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(...(reverse.get(next) ?? []));
    }
    dependents.set(file, [...seen].sort());
  }

  console.log(`Blast radius: ${files.length} modules, ${changedInGraph.length} changed against ${reason}`);
  console.log(`Cycles: ${cycles.length}`);
  for (const cycle of cycles) console.log(`  ${cycle.join(" -> ")}`);
  console.log(`lib -> components/app violations: ${boundaryViolations.length}`);
  for (const violation of boundaryViolations) console.log(`  ${violation}`);
  console.log(`Cross-feature component imports: ${crossFeatureWarnings.length}`);
  for (const warning of crossFeatureWarnings) console.log(`  ${warning}`);
  console.log(`Extensionless src/lib imports: ${extensionWarnings.length}`);
  for (const warning of extensionWarnings) console.log(`  ${warning}`);

  if (changedInGraph.length) {
    console.log("Transitive dependents:");
    for (const [file, deps] of dependents) {
      console.log(`  ${file}: ${deps.length ? deps.join(", ") : "(none)"}`);
    }
  }

  if (cycles.length || boundaryViolations.length) {
    process.exitCode = 1;
  }
}

main();
