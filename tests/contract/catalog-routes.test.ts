import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildToolMetadata } from "../../src/lib/seo.ts";
import { toolRedirects } from "../../src/lib/tool-redirects.ts";
import { TOOLS } from "../../src/lib/tools.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function routeFile(href: string): string {
  const route = href.split("?")[0];
  if (route === "/") return path.join(ROOT, "src/app/page.tsx");
  return path.join(ROOT, "src/app", route.slice(1), "page.tsx");
}

test("every catalog entry has a route", () => {
  for (const tool of TOOLS) {
    assert.equal(existsSync(routeFile(tool.href)), true, `missing route for ${tool.href}`);
  }
});

test("catalog hrefs are unique", () => {
  const hrefs = TOOLS.map((tool) => tool.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test("every catalog entry has metadata", () => {
  for (const tool of TOOLS) {
    const metadata = buildToolMetadata(tool.href);
    assert.ok(metadata.title, `missing title for ${tool.href}`);
    assert.ok(metadata.description, `missing description for ${tool.href}`);
  }
});

test("legacy redirects do not have a page and resolve to a real route", () => {
  for (const redirect of toolRedirects) {
    assert.equal(existsSync(routeFile(redirect.source)), false, `${redirect.source} should not have a page`);
    assert.equal(existsSync(routeFile(redirect.destination)), true, `${redirect.destination} should resolve`);
  }
});

test("redirect sources are not catalog entries", () => {
  const hrefs = new Set(TOOLS.map((tool) => tool.href));
  for (const redirect of toolRedirects) {
    assert.equal(hrefs.has(redirect.source), false, `${redirect.source} should not be in the catalog`);
  }
});
