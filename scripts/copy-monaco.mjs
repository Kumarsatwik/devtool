/**
 * Copies the self-hosted Monaco editor assets (min/vs) from node_modules into
 * public/monaco/vs so the app never loads the editor from a third-party CDN.
 * Runs automatically via the predev/prebuild npm scripts; skips the copy when
 * the already-copied version matches the installed one.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = `${root}node_modules/monaco-editor/min/vs`;
const dest = `${root}public/monaco/vs`;
const marker = `${root}public/monaco/.monaco-version`;

const version = JSON.parse(readFileSync(`${root}node_modules/monaco-editor/package.json`, "utf8")).version;

if (existsSync(marker) && readFileSync(marker, "utf8").trim() === version) {
  process.exit(0);
}

if (!existsSync(src)) {
  console.error("[copy-monaco] monaco-editor is not installed — run `npm install` first.");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
writeFileSync(marker, `${version}\n`);
console.log(`[copy-monaco] self-hosted Monaco ${version} copied to public/monaco/vs`);