import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  componentFeature,
  findCycles,
  parseImports,
  resolveSpecifier,
  toRel,
  walk,
} from "../../scripts/blast-radius.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC = path.join(ROOT, "src");
const files = walk(SRC).map(toRel).sort();

const graph = new Map<string, Set<string>>();
for (const file of files) graph.set(file, new Set());

for (const file of files) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const specifier of parseImports(source)) {
    const target = resolveSpecifier(file, specifier);
    if (target) graph.get(file)?.add(target);
  }
}

const edges = [...graph.entries()].flatMap(([from, targets]) =>
  [...targets].map((to) => ({ from, to })),
);

const KNOWN_EXTENSIONLESS_LIB_IMPORTS = new Set<string>();

const PURE_MODULES = new Set([
  "src/lib/csv.ts",
  "src/lib/json.ts",
  "src/lib/notes/markdown.ts",
  "src/lib/json-redact.ts",
  "src/lib/seo.ts",
  "src/lib/split.ts",
  "src/lib/svg-to-react.ts",
  "src/lib/tool-redirects.ts",
  "src/lib/tools.ts",
  "src/lib/mermaid/themes.ts",
]);

const KNOWN_CLIENT_PURE_MODULES = new Set([
  "src/lib/notes/markdown.ts",
  "src/lib/mermaid/themes.ts",
]);

const SHARED_COMPONENT_FEATURES = new Set(["ui", "shell"]);

test("the source import graph has no cycles", () => {
  assert.deepEqual(findCycles(graph), []);
});

test("lib never imports app or component code", () => {
  const violations = edges
    .filter(({ from, to }) => from.startsWith("src/lib/") && (to.startsWith("src/app/") || to.startsWith("src/components/")))
    .map(({ from, to }) => `${from} -> ${to}`);
  assert.deepEqual(violations, []);
});

test("components do not import another feature's modules", () => {
  const violations = edges
    .filter(({ from, to }) => {
      const fromFeature = componentFeature(from);
      const toFeature = componentFeature(to);
      return (
        fromFeature &&
        toFeature &&
        fromFeature !== toFeature &&
        !SHARED_COMPONENT_FEATURES.has(fromFeature) &&
        !SHARED_COMPONENT_FEATURES.has(toFeature)
      );
    })
    .map(({ from, to }) => `${from} -> ${to}`);
  assert.deepEqual(violations, []);
});

test("new extensionless src/lib imports are not introduced", () => {
  const violations: string[] = [];

  for (const file of files) {
    if (!file.startsWith("src/lib/")) continue;
    const source = readFileSync(path.join(ROOT, file), "utf8");
    for (const specifier of parseImports(source)) {
      if (!specifier.startsWith(".") || specifier.endsWith(".ts")) continue;
      if (!resolveSpecifier(file, specifier)) continue;
      const entry = `${file} -> ${specifier}`;
      if (!KNOWN_EXTENSIONLESS_LIB_IMPORTS.has(entry)) violations.push(entry);
    }
  }

  assert.deepEqual(violations, []);
});

test("declared pure modules do not acquire a client directive", () => {
  const violations = [...PURE_MODULES]
    .filter((file) => !KNOWN_CLIENT_PURE_MODULES.has(file))
    .filter((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      return /^["']use client["'];?/m.test(source);
    });

  assert.deepEqual(violations, []);
});
