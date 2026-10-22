import assert from "node:assert/strict";
import test from "node:test";
import { NOTES_MERMAID_CONFIG } from "../../src/lib/mermaid/render.ts";
import { diagramThemes, getMermaidConfig } from "../../src/lib/mermaid/themes.ts";

test("notes diagrams always render with strict security", () => {
  assert.equal(NOTES_MERMAID_CONFIG.securityLevel, "strict");
  assert.equal(NOTES_MERMAID_CONFIG.startOnLoad, false);
});

test("every standalone diagram theme is strict", () => {
  for (const theme of diagramThemes) {
    assert.equal(getMermaidConfig(theme.value).securityLevel, "strict", theme.value);
  }
});
