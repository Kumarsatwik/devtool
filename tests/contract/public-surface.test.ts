import assert from "node:assert/strict";
import test from "node:test";
import * as csv from "../../src/lib/csv.ts";
import * as json from "../../src/lib/json.ts";
import * as markdown from "../../src/lib/notes/markdown.ts";
import * as mermaidThemes from "../../src/lib/mermaid-themes.ts";
import * as sanitize from "../../src/lib/sanitize.ts";
import * as seo from "../../src/lib/seo.ts";
import * as split from "../../src/lib/split.ts";
import * as toolRedirects from "../../src/lib/tool-redirects.ts";
import * as tools from "../../src/lib/tools.ts";

const expected = {
  csv: ["csvToJSON", "jsonToCSV", "parseCSV"],
  json: [
    "assignKey",
    "beautifyJSON",
    "jsToJSON",
    "jsonToJs",
    "minifyJSON",
    "parseJSLiteral",
    "sortJSONValue",
    "validateJSON",
  ],
  markdown: ["escapeHtml", "htmlToMarkdown", "markdownToHtml"],
  mermaidThemes: [
    "defaultDiagramTheme",
    "diagramThemes",
    "getMermaidConfig",
    "getThemeSpec",
  ],
  sanitize: ["PRESET_SENSITIVE_KEYS", "collectAllKeys", "sanitizeJson"],
  seo: ["SITE_DESCRIPTION", "SITE_NAME", "SITE_URL", "buildToolMetadata"],
  split: [
    "MAX_SPLIT_PERCENT",
    "MIN_SPLIT_PERCENT",
    "clampPixels",
    "clampSplitPercent",
    "nextSplitPercentFromKey",
    "splitPercentFromPointer",
  ],
  toolRedirects: ["toolRedirects"],
  tools: ["navGroups", "tools"],
} as const;

test("public export surface is stable", () => {
  assert.deepEqual(Object.keys(csv).sort(), [...expected.csv].sort());
  assert.deepEqual(Object.keys(json).sort(), [...expected.json].sort());
  assert.deepEqual(Object.keys(markdown).sort(), [...expected.markdown].sort());
  assert.deepEqual(Object.keys(mermaidThemes).sort(), [...expected.mermaidThemes].sort());
  assert.deepEqual(Object.keys(sanitize).sort(), [...expected.sanitize].sort());
  assert.deepEqual(Object.keys(seo).sort(), [...expected.seo].sort());
  assert.deepEqual(Object.keys(split).sort(), [...expected.split].sort());
  assert.deepEqual(Object.keys(toolRedirects).sort(), [...expected.toolRedirects].sort());
  assert.deepEqual(Object.keys(tools).sort(), [...expected.tools].sort());
});
