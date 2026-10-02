import assert from "node:assert/strict";
import test from "node:test";
import { detectDiagramKind } from "../src/lib/diagrams.ts";

test("detects diagram kind for mermaid", () => {
  assert.equal(detectDiagramKind("graph TD\n  A --> B", "mermaid"), "mermaid");
});

